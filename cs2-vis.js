/*!
 * cs2-vis.js — PVS (potentially-visible-set) visibility culling for Clutcher.io
 * ===========================================================================
 * PORTED FROM : the v0.21 decompiled build
 *               .port/v021/main.js  (readable: .port/analysis/v021-readable.js)
 * PORTED TO   : clutcher-deploy/src-decompiled/main.js
 *               (SHA-256 3cb27010..., 57,278 lines) + three-B50Y55N1.js (r160)
 *
 * This file is ADDITIVE. It writes nothing, patches nothing on disk, and only
 * installs runtime hooks on live three.js objects. It is a no-op when the
 * feature is off, and every consumer is reversible at runtime.
 *
 * ===========================================================================
 * 1. WHAT THIS IS
 * ===========================================================================
 * The CVIS payload is a precomputed portal-graph style visibility structure:
 * a 16x16x16 grid of clusters over the map, a spatial octree that maps an
 * arbitrary AABB to the clusters it touches, and a 4096 x 512-byte bit matrix
 * of cluster-to-cluster visibility. A camera's visible set is the OR of the
 * visibility rows of the clusters around it.
 *
 * The game is CPU draw-call bound (measured: 386-716 draws/frame at 10.43 us
 * of CPU each; 960 meshes, 729 materials, 27 InstancedMesh, 70 SkinnedMesh).
 * Shadows are BAKED -- renderer.shadowMap.enabled = false (main.js:49868),
 * autoUpdate false, zero shadow casters -- so a wrongly culled surface does
 * not go dark, it simply VANISHES with no shader or lighting cue whatsoever.
 * Over-culling is therefore the single dangerous failure mode of this
 * subsystem. Every ambiguous path here returns null ("do not cull") rather
 * than guessing, and a runtime self-test refuses to enable culling unless the
 * structure demonstrably agrees with the map that is actually loaded.
 *
 * ===========================================================================
 * 2. v0.21 -> HERE: IDENTIFIER MAP  (every function ported)
 * ===========================================================================
 *  v021r line   v0.21 name        name here                    file section
 *  -----------  ----------------  ---------------------------  -----------
 *   2527        var Xn = .0254    CFG.XN (re-derived, sec. 3)  CONFIG
 *   2528-2752   class Zn          class Pvs                    "Pvs"
 *   2529-2573    Zn constructor   Pvs(buffer)                  "Pvs"
 *   2574-2586    Zn.load(url)     Pvs.load(url)     [static]   "Pvs"
 *   2587-2673    Zn._collect      Pvs.prototype._collect
 *   2674-2692    Zn.boxClusters   Pvs.prototype.boxClusters
 *   2693-2739    Zn.bitsFor      Pvs.prototype.bitsFor
 *   2740-2751    Zn.anyVisible    Pvs.anyVisible      [static]   "anyVisible"
 *   2754-2794  Qn(m, clusters,v)  hookMesh(mesh, clusters, vis)
 *   52699-52725 lb(vis,bb,mw)     worldBoxClusters(vis, bbox, matrixWorld)
 *   2892-2912  ur.cullWith(vis)   cullEntityManager(entMgr, vis)
 *   40751-40768 Hh(ent,vis,bits,  botProbeVisible(ent, vis, bits, dynCast, y)
 *                  dynCast,y)
 *   43666-43693 Yg.cullAgents     wrapped, not rewritten:     "BOT OCCLUSION"
 *   53155-53171 leftover sweep    sweepLeftoverMeshes(root, vis)
 *   59787      this.map.vis =    installAfterMapLoad (our loadMap wrapper)
 *   59803      mapEnts.cullWith  installAfterMapLoad, step 1
 *   53649-53652 ?vis=0 + swallow  CFG.enabled / loadVis()
 *
 * Binary format (little endian), verified byte-for-byte against the real
 * oasis_vis.bin.gz (4,031,832 B) and dusker_vis.bin.gz (3,901,016 B):
 *   0x00 u32   0x53495643 "CVIS"
 *   0x04 u32   version = 1
 *   0x08 u32   clusters = 4096                       (16x16x16 grid)
 *   0x0c u32   rowBytes = clusters / 8 = 512
 *   0x10 f32[3] min                                  (world AABB min, INCHES)
 *   0x1c f32    size                                 (cube edge, INCHES)
 *   0x24   six (u32 offset, u32 length) pairs:
 *             i=0 nodes   : 2 u32/node.  bit0 = leaf flag, childBase = v>>>1,
 *                           regionCount = v & 0xff.  Leaves reuse the same word:
 *                           v>>>1 is the REGION base, not a child base.
 *             i=1 regions : 2 u32/entry.  w0 = clusterId & 0x7fff,
 *                           w1 >>> 8 = maskId (index into section 4).
 *             i=4 masks   : 2 u32/entry.  a 64-bit mask over the leaf's 4x4x4
 *                           sub-cells (bit r = local cluster r).
 *             i=5 pvs     : clusters * rowBytes, the full visibility matrix,
 *                           plus a small trailer v0.21 also ignores.
 * Measured Oasis tree: 90,529 nodes = 11,316 interior + 79,213 leaves;
 * 94,869 region entries; maskIds 0..12,817; clusterIds 0..4095.  A leaf is a
 * spatial cell FINER than a cluster, so one global cluster is normally reached
 * through several leaves; a leaf straddling a cluster boundary has >1 region.
 *
 * ===========================================================================
 * 3. WORLD SCALE  --  RE-DERIVED FROM OUR OWN DATA, NOT COPIED
 * ===========================================================================
 * CVIS coordinates are INCHES; the game world is METRES, so world/Xn is the
 * conversion. Four independent pieces of evidence, all from OUR build:
 *
 * (1) Our build ships the constant literally. 0.0254 appears 14x in
 *     clutcher-deploy/src-decompiled/main.js, and twice as a *conversion*
 *     between an inch-authored asset number and world metres:
 *       main.js:47053-47055  map.bombRadius  (from oasis_data.json) * 0.0254
 *                            -> the game's bomb radius in world metres
 *       main.js:33002        Math.hypot(muzzleOffset) * 0.0254
 *       main.js:48631        static IN = 0.0254, used at :48639 to place the
 *                            ADS camera from authored inch offsets
 *       main.js:39105        matrix.scale(0.0254 x3) for the bomb waypoint
 *       main.js:38573        worldDistance / 0.0254, compared against an
 *                            inch-authored hearing radius
 *     i.e. this build's whole asset pipeline is inch-authored / metre-world.
 *
 * (2) Magnitude. Oasis CVIS min = [-5228,-5004,-3848], size = 8192 in.
 *     At Xn = 0.0254 that is a 208.00 m cube with 13.00 m cells. The map
 *     (clutcher-deploy/models/oasis_data.json bounds) is
 *     min [-98.1464,-11.38,-104.0392] max [52.0201,26.0104,52.02] m =
 *     150.17 x 37.39 x 156.06 m. The right order of magnitude, with the large
 *     y padding a 3D PVS grid needs.
 *
 * (3) The AXIS PERMUTATION is the decisive question, and it is not the
 *     identity. v0.21 feeds _collect() the CVIS triple
 *         cvis_x <- game_z,  cvis_y <- game_x,  cvis_z <- game_y
 *     at BOTH call sites (bitsFor v021r:2703-2711, boxClusters v021r:2680-2685),
 *     which is the textbook Source(x,y,z) -> three.js(x,z,y) conversion.
 *     Measured, in INCHES (divide metres by 0.0254):
 *         game axis centres : x = -908.00   y = +288.00   z = -1024.00
 *         cvis axis centres : x = -1132.00  y = -908.00   z = +248.00
 *     cvis_y's centre equals game_x's centre to within 0.02 inch on a 5912-inch
 *     (150 m) axis. That is not a coincidence; it pins cvis_y <-> game_x.
 *     The remaining assignment is forced by elimination and confirmed by
 *     containment: of the 48 (permutation x flip) candidates, 12 contain the
 *     map at all, and the v0.21 one is the best of them:
 *         perm [2,0,1] flip 000  worst face margin 23.27 m   <-- v0.21, chosen
 *         perm [0,2,1] flip 000  worst face margin 23.06 m
 *         perm [1,2,0] / [2,1,0] flip 001   worst 12.19 m
 *         perm [0,1,2] / [1,0,2] flip 001   worst  6.30 m
 *     With the identity mapping the map's z-min (-104.04 m) falls 6.30 m
 *     OUTSIDE the grid, which would silently mis-cull the whole -z slab.
 *
 * (4) The mapping is additionally re-derived at runtime against the map that
 *     is actually loaded, and there are three independent runtime gates. It is
 *     worth being precise about what each one can and cannot catch, because
 *     getting this wrong is how a slab of the map disappears:
 *
 *     GATE A -- verifyFit() / pickAxisMapping(). Hard filter: the candidate
 *       must contain the live map AABB on all six faces (12 of the 48
 *       candidates contain Oasis at all). Rank the survivors by OCCUPANCY:
 *       what fraction of real map SURFACE POINTS land in an occupied leaf.
 *       This is the ONLY test that can see a permutation, because the map's
 *       geometry is the one external reference the CVIS data cannot rotate
 *       along with. Measured live on the real map: perm [2,0,1] 0.9865,
 *       [0,2,1] 0.6861, [2,1,0] 0.3161, [1,2,0] 0.2937, [0,1,2] and [1,0,2]
 *       0.1749. A 30-point gap, and the geometric centre alignment
 *       (section 3, item 3) independently agrees. Refuse below
 *       SURFACE_HIT_MIN.
 *
 *     GATE B -- bitsFor() returning null. If the camera's own clusters are
 *       not in the table, nothing is culled, ever. A global scale error (wrong
 *       Xn) puts every camera outside the grid and trips this on its own.
 *
 *     GATE C -- nearFieldCheck(), run from the live camera. Points 2-8 m in
 *       front are essentially never occluded, so a healthy structure reports
 *       them visible. HONEST SCOPE: this is an INTERNAL-CONSISTENCY and
 *       scale/garbage gate, NOT a handedness discriminator. bitsFor() and the
 *       probe boxes are both evaluated in whatever frame is installed, so they
 *       stay mutually consistent under ANY permutation -- measured live, all
 *       six permutations score 275/275 here. It still earns its place: it
 *       catches a wrong Xn, a corrupt table, a camera left outside the grid,
 *       and it is cheap. Do not mistake it for the permutation evidence.
 *
 *     Plus the over-cull watchdog and restoreAll()/unhookAll().
 *
 * (5) A SECOND, EASIER-TO-MISS TRAP: _collect() takes MIN first --
 *     (minX, minY, minZ, maxX, maxY, maxZ). The node AABB cull reads the same
 *     either way round, so only the leaf sub-cell loops disambiguate it, and
 *     those loop ASCENDING. Passing max-first compiles, runs, and returns an
 *     EMPTY cluster list for every real AABB -- and a degenerate (zero-size)
 *     query box hides the bug, because then lo == hi. See _collect().
 *
 * ===========================================================================
 * 4. PUBLIC API  (window.__CS2_VIS__)  -- also for the batching agent
 * ===========================================================================
 *   const vis  = __CS2_VIS__.get();          // Pvs | null (null = do not cull)
 *   const bits = vis && vis.bitsFor(camera); // Uint8Array | null
 *   __CS2_VIS__.anyVisible(cellClusters, bits)          // true = submit the cell
 *   __CS2_VIS__.worldBoxClusters(vis, bbox, matrixWorld) // cell cluster list
 *   __CS2_VIS__.hookMesh(mesh, clusterList, vis)        // per-mesh PVS hook
 *
 * ===========================================================================
 * 5. KILL SWITCHES
 * ===========================================================================
 *   ?vis=0            disable entirely (v0.21 parity, v021r:53649)
 *   ?vismode=...      comma list of: meshes, ents, bots, hide, audit
 *                     (default "meshes,ents"; bots and hide are opt-in)
 *   ?vishide=1        hard-cull mode: also drive mesh.visible (see sec. 6)
 *   ?visbots=1        bot occlusion -- GAMEPLAY, DEFAULT OFF (see sec. 8)
 *   ?visurl=<url>     override the CVIS URL for a single map
 *   ?visbase=<dir>    override the directory holding <map>_vis.bin.gz
 *   __CS2_VIS__.disable(reason) / .enable() / .restoreAll() / .unhookAll()
 *
 * ===========================================================================
 * 6. MEASURED FINDING: drawRange.count = 0 DOES NOT ELIDE A DRAW CALL
 * ===========================================================================
 * v0.21's Qn() culls by zeroing geometry.drawRange.count inside
 * onBeforeRender. That is ported faithfully below, and it is NOT a no-op -- but
 * it does not do what one would assume. In the r160 chunk we actually ship:
 *   three-B50Y55N1.js:19437-19438
 *       let m = p - f;                       // p = (start+count)*l
 *       if (m < 0 || m === 1/0) return;     // count = 0 gives m = 0 -> NO return
 *   three-B50Y55N1.js:19472  g.render(f, 0);   // still called
 *   three-B50Y55N1.js:13095-13096
 *       function u(t,r){ e.drawElements(a,r,s,t*c), n.update(r,a,1); }
 *   three-B50Y55N1.js:13135  switch((n.calls++, r)) {...}   // info.render.calls++
 * So with count = 0 three still runs the whole renderBufferDirect / setProgram
 * / setMaterial path and still issues gl.drawElements(mode, 0, ...), and it
 * still increments renderer.info.render.calls. Qn saves the (free) raster and
 * vertex work, not the CPU cost of the draw call.
 *
 * Because the objective is to remove DRAW CALLS, this file also provides a
 * hard-cull mode (?vishide=1, DEFAULT OFF) that maintains mesh.visible from a
 * pre-render pass, so the object is dropped from the render list by
 * projectObject() and the draw call never happens. The `visible` channel is
 * shared, so the mode is opt-in; the audit of every `.visible` reader in
 * main.js is in the port report and found only the shader-precompile
 * force-visible passes (main.js:51896-51901, :54629-54643) and the skin
 * inspector (:51017, :30483, :30534, :48440), all of which are either off the
 * map subtree or save-and-restore correctly. main.js:52016 (_siteFloor,
 * load-time only) skips invisible meshes, so it must not be running while hard
 * cull is on.
 *
 * MEASURED, in a live bot match on Oasis, 57 frames per sample, median of
 * renderer.info.render.calls (the same camera pose, the same scene):
 *     Qn drawRange mode, culling OFF   611
 *     Qn drawRange mode, culling ON    608     -> -3 calls, 0.5%, i.e. nothing
 *     hard cull,        culling OFF    611
 *     hard cull,        culling ON     473     -> -138 calls, 22.6%
 * The render loop stayed alive with hard cull on, and every mesh was restored
 * (446 visible again) the moment it was switched off.
 */

(function () {
  "use strict";

  // =========================================================================
  // CONFIG
  // =========================================================================
  var Q = new URLSearchParams(location.search);

  var CFG = {
    /** metres -> CVIS inches. See section 3. Do not change without re-deriving. */
    XN: 0.0254,
    /** clusters along one leaf edge; a leaf is 4x4x4 = 64 sub-cells. Format constant. */
    SUB: 4,
    /**
     * +-N CVIS UNITS (INCHES, not cells) around the camera in bitsFor().
     * v0.21 uses 4 (v021r:2706-2711), i.e. a 0.8 inch / 0.2 m box, which
     * resolves to the one or two clusters the camera is standing in. This is
     * NOT "+-4 grid cells" (13 m each) -- that would OR 729 visibility rows at
     * a measured 1.1% density and saturate the bitset to nearly all-ones, i.e.
     * cull nothing. Keeping the units honest is load-bearing.
     */
    CAM_RADIUS: 4,
    /** cullWith() expands each entity AABB by this many metres. v0.21: 0.25 */
    ENT_EXPAND: 0.25,
    /** never hook meshes belonging to the parallel batching layer */
    BATCH_NAMES: ["cs2batch"],
    /** traversal budget: a malformed octree must not hang the tab */
    COLLECT_BUDGET: 400000,
    /**
     * Over-cull watchdog. Shadows are baked, so an over-culled surface just
     * disappears with no error. If more than WATCHDOG_RATIO of the meshes that
     * actually rendered this frame were culled, for WATCHDOG_FRAMES frames in
     * a row, culling disables itself and everything is restored.
     */
    WATCHDOG: true,
    WATCHDOG_RATIO: 0.995,
    WATCHDOG_FRAMES: 30,
    WATCHDOG_MIN_MESHES: 40,
    /** self-test thresholds */
    SURFACE_HIT_MIN: 0.5,   // >=50% of real map surface points must be in the table
    NEARFIELD_MIN: 0.7,     // >=70% of points 2-8 m in front must read visible
    NEARFIELD_PASSES: 5,    // consecutive passing evaluations before the gate opens
    NEARFIELD_FAILS: 5,     // consecutive valid FAILING evaluations -> give up
    /**
     * SCALE SANITY BOUND. Containment alone does not catch a wrong Xn: a grid
     * that is far too large still trivially contains the map. Measured, with
     * Xn forced to 1.0, verifyFit() returned ok:true with 6 containing
     * candidates -- the check was useless there. This bound does catch it:
     * the grid cube edge may be at most MAX_GRID_RATIO times the map's largest
     * AABB dimension. Oasis: 208.0 m edge vs 156.1 m -> 1.33, fine. Xn = 1.0:
     * 8192 m -> 52x, refused. Dusker's 16384 in edge is 416.1 m, 1.7x a
     * comparable map, also fine.
     */
    MAX_GRID_RATIO: 6,
    LOG: true,
  };

  var DEFAULT_URL_BASE = "./models/";
  var urlBase = Q.get("visbase") || DEFAULT_URL_BASE;

  var modes = {
    meshes: false, // per-mesh PVS on the non-batched map meshes   (Qn / v0.21)
    ents: false,   // map-entity PVS                              (cullWith)
    hide: false,   // hard cull: drive mesh.visible (NOT in v0.21, see sec. 6)
    bots: false,   // bot occlusion -- GAMEPLAY, DEFAULT OFF
    audit: false,  // read-only bot probe, mutates nothing
  };
  var enabled = Q.get("vis") !== "0";
  if (enabled) {
    // The default profile is the two purely visual consumers, which is what
    // v0.21 ships. `bots` and `hide` are opt-in and are NOT implied by default.
    var m = (Q.get("vismode") || Q.get("vismodes") || "meshes,ents").split(",");
    for (var i = 0; i < m.length; i++) {
      var key = m[i].trim().toLowerCase();
      if (key in modes) modes[key] = true;
    }
    if (Q.get("vishide") === "1") modes.hide = true;
    if (Q.get("visbots") === "1") modes.bots = true;
  }

  function log() {
    if (!CFG.LOG) return;
    var a = Array.prototype.slice.call(arguments);
    a[0] = "[mapvis] " + a[0];
    console.log.apply(console, a);
  }
  function warn() {
    var a = Array.prototype.slice.call(arguments);
    a[0] = "[mapvis] " + a[0];
    console.warn.apply(console, a);
  }

  // =========================================================================
  // Pvs  --  port of v0.21 `Zn`  (v021r:2528-2752)
  // =========================================================================
  var CVIS_MAGIC = 0x53495643;
  var SUB = CFG.SUB;
  var PER_LEAF = SUB * SUB * SUB;      // 64 sub-cells per leaf
  var V021_PERM = [2, 0, 1];           // cvis axis i reads game axis perm[i]
  var PERMS = [
    [0, 1, 2], [0, 2, 1], [1, 0, 2],
    [1, 2, 0], [2, 0, 1], [2, 1, 0],
  ];

  /** Throw a loud, named error rather than silently mis-parsing. */
  function fail(msg) { throw new Error("mapvis: " + msg); }

  function Pvs(buffer) {
    if (!buffer || buffer.byteLength < 0x54) {
      fail("not a CVIS file (too short: " + (buffer ? buffer.byteLength : 0) + " bytes)");
    }
    var t = new DataView(buffer);

    // ---- header, every invariant asserted ---------------------------------
    var magic = t.getUint32(0x0, true);
    if (magic !== CVIS_MAGIC) {
      // v0.21's message, verbatim: "mapvis: not a CVIS file"
      fail("not a CVIS file (magic 0x" + magic.toString(16) + ")");
    }
    var version = t.getUint32(0x4, true);
    if (version !== 1) fail("unsupported CVIS version " + version + " (expected 1)");

    this.clusters = t.getUint32(0x8, true);
    this.rowBytes = t.getUint32(0xc, true);
    this.min = [t.getFloat32(0x10, true), t.getFloat32(0x14, true), t.getFloat32(0x18, true)];
    this.size = t.getFloat32(0x1c, true);

    if (this.clusters === 0 || this.clusters % PER_LEAF !== 0 || this.clusters > 0x8000) {
      fail("implausible cluster count " + this.clusters +
        " (need a positive multiple of " + PER_LEAF + ", <= 32768)");
    }
    if (this.rowBytes !== this.clusters / 8) {
      fail("rowBytes " + this.rowBytes + " != clusters/8 (" + (this.clusters / 8) + ")");
    }
    if (!isFinite(this.size) || this.size <= 0) fail("bad grid size " + this.size);
    for (var mi = 0; mi < 3; mi++) {
      if (!isFinite(this.min[mi])) fail("bad grid min[" + mi + "] " + this.min[mi]);
    }

    // ---- section table ------------------------------------------------------
    function sec(i) {
      return [t.getUint32(0x24 + i * 0x8, true), t.getUint32(0x28 + i * 0x8, true)];
    }
    var sp = sec(0x0), gr = sec(0x1), mk = sec(0x4), pv = sec(0x5);

    /** Every section must fit INSIDE the inflated buffer, 4-byte aligned. */
    function check(name, s, bytesPerEntry) {
      if (s[1] === 0) { fail(name + " section is empty"); }
      if (s[0] % 4 !== 0) fail(name + " section offset " + s[0] + " is not 4-byte aligned");
      var need = s[0] + s[1] * bytesPerEntry;
      if (need > buffer.byteLength) {
        fail(name + " section overflows file (needs " + need + ", file is " +
          buffer.byteLength + " bytes)");
      }
    }
    check("nodes", sp, 8);
    check("regions", gr, 8);
    check("masks", mk, 8);
    check("pvs", pv, 1);

    var needPvs = this.clusters * this.rowBytes;
    if (pv[1] < needPvs) {
      fail("pvs section is " + pv[1] + " bytes, need at least " + needPvs);
    }
    // The real files carry a small trailer after the matrix (oasis: 1024 B =
    // 2 rows, and the section ends on the file's last byte). v0.21 never looks
    // at it, so neither do we -- but the surplus is reported, not ignored.
    this.pvsTail = pv[1] - needPvs;

    this._nRegions = gr[1];
    this._nMasks = mk[1];

    // ---- typed views over the SAME buffer (no copy) -------------------------
    this.nodes = new Uint32Array(buffer, sp[0], sp[1] * 2);
    this.regions = new Uint32Array(buffer, gr[0], gr[1] * 2);
    this.masks = new Uint32Array(buffer, mk[0], mk[1] * 2);
    this.pvs = new Uint8Array(buffer, pv[0], pv[1]);

    // ---- scratch state (v0.21 fields, renamed) ------------------------------
    this._bits = new Uint8Array(this.rowBytes); // v0.21: this["_bits"]
    this._camKey = NaN;                        // v0.21: this["_camKey"]
    this._camX = NaN;                          // DEVIATION: exact position
    this._camY = NaN;
    this._camZ = NaN;
    this._camOk = false;                       // v0.21: this["_camOk"]
    this._camList = "";                        // v0.21: this["_camList"]
    this.version = 0;                          // v0.21: this["version"]
    this._stack = [];                          // v0.21: this["_stack"]
    this._seen = new Uint8Array(this.clusters + 0x2);
    this._found = [];                          // v0.21: this["_found"]
    this._budget = 0;                          // DEVIATION: traversal budget
    this.stats = { lookups: 0, collects: 0, budgetTrips: 0, maxFound: 0 };

    // ---- world -> CVIS axis mapping -----------------------------------------
    this.perm = V021_PERM.slice();
    this.flip = [false, false, false];
    this.permSource = "v0.21 default [2,0,1], unverified against this map yet";

    this._tmpLo = [0, 0, 0];
    this._tmpHi = [0, 0, 0];
  }

  /**
   * Port of v0.21 `Zn.load` (v021r:2574-2586).
   *   non-OK response                       -> rejects "mapvis: <status> <url>"
   *   gzip magic 1f 8b, no DecompressionStream -> resolves NULL (v0.21 parity)
   *   gzip magic 1f 8b                        -> inflate with DecompressionStream
   *   otherwise                              -> the bytes already are a CVIS file
   * @returns {Promise<Pvs|null>}
   */
  Pvs.load = function (url) {
    // fetch() is a normal function that returns a promise, but a polyfilled or
    // wrapped environment can throw synchronously (CSP, bad shim). Force that
    // into the promise chain so callers only ever see a rejection.
    var p;
    try {
      p = fetch(url);
    } catch (e) {
      return Promise.reject(new Error("mapvis: " + (e && e.message ? e.message : e)));
    }
    return Promise.resolve(p).then(function (n) {
      if (!n["ok"]) {
        // v0.21: throw Error("mapvis: "+n["status"]+" "+t)
        return Promise.reject(new Error("mapvis: " + n["status"] + " " + url));
      }
      return n.arrayBuffer();
    }).then(function (r) {
      var head = new Uint8Array(r, 0x0, 0x2);
      if (head[0x0] === 0x1f && head[0x1] === 0x8b) {
        if (typeof DecompressionStream === "undefined") {
          // graceful degradation, ported verbatim from v0.21
          warn("gzip payload but no DecompressionStream here -- visibility disabled");
          return null;
        }
        return new Response(new Blob([r]).stream().pipeThrough(new DecompressionStream("gzip")))
          .arrayBuffer();
      }
      return r;
    }).then(function (buf) {
      if (buf == null) return null;
      return new Pvs(buf);
    });
  };

  /**
   * Port of v0.21 `Zn._collect` (v021r:2587-2673), faithful in behaviour.
   *
   * ARGUMENT ORDER: (minX, minY, minZ, maxX, maxY, maxZ) -- MIN FIRST. See
   * section 3, item (5) for why this is not a guess and what breaks if you get
   * it backwards.
   *
   * DEVIATION: a traversal budget. v0.21 has none, so a malformed octree that
   * never reaches a leaf hangs the tab. Here the walk gives up and returns
   * what it has, which is conservative (a partial list culls less).
   */
  Pvs.prototype._collect = function (minX, minY, minZ, maxX, maxY, maxZ) {
    // v0.21's local letters, so the body below reads as v0.21's:
    //   e=minX  t=minY  n=minZ   r=maxX  i=maxY  a=maxZ
    var e = minX, t = minY, n = minZ, r = maxX, i = maxY, a = maxZ;
    var o = this.nodes, s = this.regions, c = this.masks;
    var l = this._seen, u = this._found, d = this._stack;
    var f = this.min, gmin = this.clusters, maxMask = this._nMasks;
    u.length = 0x0;
    for (d.length = 0x0, d.push(0x0, f[0x0], f[0x1], f[0x2], this["size"]); d.length;) {
      if (++this._budget > CFG.COLLECT_BUDGET) {
        this.stats.budgetTrips++;
        break;
      }
      var fsz = d.pop(), pz = d.pop(), py = d.pop(), px = d.pop(), g = d.pop();
      // cull the node against the query AABB (reads the same max-first)
      if (r < px || i < py || a < pz || e > px + fsz || t > py + fsz || n > pz + fsz) {
        continue;
      }
      var v0 = o[g * 0x2], v1 = o[g * 0x2 + 0x1];
      if (v0 & 0x1) {
        // ---- leaf: 4x4x4 sub-cells -> 64-bit candidate mask -----------------
        var regionCount = v1 & 0xff;
        if (!regionCount) continue;
        var sub = fsz / SUB;
        var xi0 = clampQ(Math.floor((e - px) / sub)), xi1 = clampQ(Math.floor((r - px) / sub));
        var yi0 = clampQ(Math.floor((t - py) / sub)), yi1 = clampQ(Math.floor((i - py) / sub));
        var zi0 = clampQ(Math.floor((n - pz) / sub)), zi1 = clampQ(Math.floor((a - pz) / sub));
        var T = 0x0, E = 0x0;  // 32-bit halves of the candidate mask
        for (var zi = zi0; zi <= zi1; zi++) {
          for (var yi = yi0; yi <= yi1; yi++) {
            for (var xi = xi0; xi <= xi1; xi++) {
              var cid = xi + SUB * yi + SUB * SUB * zi;
              if (cid < 0x20) { T |= 0x1 << cid; } else { E |= 0x1 << (cid - 0x20); }
            }
          }
        }
        var base = v0 >>> 0x1;   // for a leaf this word is the REGION base
        for (var ri = base; ri < base + regionCount; ri++) {
          if (ri * 0x2 + 0x1 >= s.length) continue;   // never read out of bounds
          var maskId = s[ri * 0x2 + 0x1] >>> 0x8;
          if (maskId >= maxMask) continue;
          if ((c[maskId * 0x2] & T | c[maskId * 0x2 + 0x1] & E) === 0x0) continue;
          var cluster = s[ri * 0x2] & 0x7fff;
          if (cluster >= gmin) continue;              // never index _seen OOB
          if (!l[cluster]) { l[cluster] = 0x1, u.push(cluster); }
        }
      } else {
        // ---- interior: split into 8 octants ---------------------------------
        var half = fsz / 0x2;
        var childBase = v0 >>> 0x1;
        if (childBase + 8 > o.length / 2) continue;   // corrupt child base
        for (var ch = 0x0; ch < 0x8; ch++) {
          d.push(childBase + ch,
            px + (ch & 0x1 ? half : 0x0),
            py + (ch & 0x2 ? half : 0x0),
            pz + (ch & 0x4 ? half : 0x0),
            half);
        }
      }
    }
    for (var q = 0; q < u.length; q++) l[u[q]] = 0x0;   // reset _seen
    this.stats.collects++;
    if (u.length > this.stats.maxFound) this.stats.maxFound = u.length;
    return u;
  };
  function clampQ(x) { return x < 0x0 ? 0x0 : x > 0x3 ? 0x3 : x; }

  /** world (metres, game axes) -> CVIS (inches) for one point. */
  Pvs.prototype._toCvis = function (x, y, z, out) {
    var g = [x, y, z], inv = 1 / CFG.XN, p = this.perm, f = this.flip;
    out[0] = (f[0] ? -g[p[0]] : g[p[0]]) * inv;
    out[1] = (f[1] ? -g[p[1]] : g[p[1]]) * inv;
    out[2] = (f[2] ? -g[p[2]] : g[p[2]]) * inv;
  };

  /**
   * Port of v0.21 `Zn.boxClusters` (v021r:2674-2692).
   *   v0.21: boxClusters(minX,minY,minZ,maxX,maxY,maxZ)  -- world metres
   *   v0.21 body: _collect(maxZ/Xn, minX/Xn, minY/Xn, maxZ, maxX, maxY)
   * i.e. the CVIS triple is (game_z, game_x, game_y) and the MIN corner comes
   * first. Returns null for an empty list or any out-of-range id; that null is
   * the "do not cull this" signal and is preserved exactly.
   */
  Pvs.prototype.boxClusters = function (minX, minY, minZ, maxX, maxY, maxZ) {
    this._budget = 0;
    var lo = this._tmpLo, hi = this._tmpHi;
    this._toCvis(minX, minY, minZ, lo);
    this._toCvis(maxX, maxY, maxZ, hi);
    // A flipped axis must not be reordered into a valid box: leave min > max so
    // the root node is rejected outright rather than silently mirrored.
    for (var k = 0; k < 3; k++) {
      if (this.flip[k]) { var tmp = lo[k]; lo[k] = hi[k]; hi[k] = tmp; }
    }
    var out = this._collect(lo[0], lo[1], lo[2], hi[0], hi[1], hi[2]);
    if (!out.length) return null;
    for (var j = 0; j < out.length; j++) {
      if (out[j] >= this.clusters) return null;
    }
    return Uint16Array.from(out);
  };

  /**
   * Port of v0.21 `Zn.bitsFor` (v021r:2693-2739).
   *
   * Returns the 512-byte visibility bitset for `camera`, or NULL when the
   * camera's own clusters are absent from the table -- "do not cull at all".
   * That null is the safety valve and is preserved EXACTLY.
   *
   * DEVIATION 1: v0.21 memoises on a lossy float hash of the camera position
   * (a = x*0x466f45d + y*0x127409f + z*0x4f9ffb7). Two distinct positions can
   * collide, which would serve a stale bitset and cull geometry that should be
   * visible. Here the exact position is stored and compared too, so a hash hit
   * with a different position recomputes. Same two compares on the hot path.
   * DEVIATION 2: version is force-bumped when leaving the table so that any
   * consumer caching per-version results (the batching layer does) recomputes.
   */
  Pvs.prototype.bitsFor = function (e) {
    var el = e["matrixWorld"]["elements"];
    var wx = el[0xc], wy = el[0xd], wz = el[0xe];
    var h = wx * 0x466f45d + wy * 0x127409f + wz * 0x4f9ffb7;
    if (h === this._camKey && wx === this._camX && wy === this._camY && wz === this._camZ) {
      return this._camOk ? this._bits : null;
    }
    this._camKey = h; this._camX = wx; this._camY = wy; this._camZ = wz;
    this.stats["lookups"]++;

    this._budget = 0;
    var inv = 1 / CFG.XN, R = CFG.CAM_RADIUS, p = this.perm, fl = this.flip;
    var g = [wx, wy, wz];
    var cLo = [], cHi = [], ax;
    for (ax = 0; ax < 3; ax++) {
      var v = (fl[ax] ? -g[p[ax]] : g[p[ax]]) * inv;
      cLo[ax] = v - R; cHi[ax] = v + R;
    }
    for (ax = 0; ax < 3; ax++) {
      if (fl[ax]) { var t = cLo[ax]; cLo[ax] = cHi[ax]; cHi[ax] = t; }
    }
    var l = this._collect(cLo[0], cLo[1], cLo[2], cHi[0], cHi[1], cHi[2]);
    var bad = !l.length;
    for (var z = 0; z < l.length; z++) { if (l[z] >= this.clusters) { bad = true; break; } }
    if (bad) {
      if (this._camOk) this.version++;
      this._camOk = false;
      return null; // "camera is not in the table" -> do not cull
    }

    var d = l.slice().sort(function (a, b) { return a - b; }).join(",");
    if (d !== this._camList || !this._camOk) {
      this._camList = d;
      this.version++;
      var bits = this._bits, rowBytes = this.rowBytes, pvs = this.pvs;
      bits.fill(0x0);
      for (var i = 0; i < l.length; i++) {
        var cid = l[i];
        var base = cid * rowBytes;
        for (var r = 0x0; r < rowBytes; r++) bits[r] |= pvs[base + r];
        // v0.21 v021r:2736 -- the trailing `e[r>>3] |= 1<<(r&7)` LOOKS like it
        // belongs to the inner `for (let r = 0; r < t; r++)` loop, but `let r`
        // there is block-scoped to that for-statement, so at this point `r` is
        // still the OUTER loop variable, i.e. the cluster id from `for (let r
        // of l)`. It therefore sets ONE self-visibility bit per camera
        // cluster, not all 4096. Reading it as "set every bit" yields an
        // all-ones visibility set and culls nothing at all.
        bits[cid >> 0x3] |= 0x1 << (cid & 0x7);
      }
    }
    this._camOk = true;
    return this._bits;
  };

  /**
   * Port of v0.21 `Zn.anyVisible` (v021r:2740-2751). This is the membership
   * test the parallel batching agent should use per cell. A falsy cluster list
   * or a falsy bitset means "unknown" and returns TRUE, i.e. draw.
   */
  Pvs.anyVisible = function (clusters, bits) {
    if (!clusters || !bits) return true;
    for (var i = 0; i < clusters.length; i++) {
      var r = clusters[i];
      if (bits[r >> 0x3] & 0x1 << (r & 0x7)) return true;
    }
    return false;
  };

  /** The CVIS grid box expressed in world metres -- diagnostics and the fit check. */
  Pvs.prototype.worldBox = function () {
    var p = this.perm, fl = this.flip, XN = CFG.XN;
    var lo = [0, 0, 0], hi = [0, 0, 0];
    for (var i = 0; i < 3; i++) {
      var a = this.min[i] * XN, b = (this.min[i] + this.size) * XN;
      if (fl[i]) { var t = a; a = -b; b = -t; }
      lo[p[i]] = a; hi[p[i]] = b;
    }
    return { min: lo, max: hi };
  };

  /**
   * Re-derive the world -> CVIS axis mapping from OUR data instead of trusting
   * the v0.21 constant. Hard filter: the candidate must contain the live map
   * AABB on all six faces (geometric containment -- and note that this cannot
   * see handedness, which is why the empirical pass below exists).
   *
   * @param {{min:number[],max:number[]}} worldBox  map AABB in world metres
   * @param {number[][]|null} samples  optional world-space surface points
   * @returns {Array} ranked candidates, best first
   */
  Pvs.prototype.pickAxisMapping = function (worldBox, samples) {
    var inv = 1 / CFG.XN;
    var out = [];
    for (var pi = 0; pi < 6; pi++) {
      for (var fi = 0; fi < 8; fi++) {
        var perm = PERMS[pi];
        var flip = [!!(fi & 1), !!(fi & 2), !!(fi & 4)];
        var ok = true, sumMin = 0, worst = Infinity, margins = [];
        for (var ax = 0; ax < 3; ax++) {
          var j = perm[ax];
          var wLo = flip[ax] ? -worldBox.max[j] : worldBox.min[j];
          var wHi = flip[ax] ? -worldBox.min[j] : worldBox.max[j];
          var lo = (wLo * inv - this.min[ax]) * CFG.XN;         // m above the floor
          var hi = (this.min[ax] + this.size - wHi * inv) * CFG.XN; // m below the ceiling
          margins.push([+lo.toFixed(2), +hi.toFixed(2)]);
          if (!(lo > 0) || !(hi > 0)) { ok = false; break; }
          sumMin += lo < hi ? lo : hi;
          if (lo < worst) worst = lo;
          if (hi < worst) worst = hi;
        }
        if (!ok) continue;
        var isV021 = perm[0] === 2 && perm[1] === 0 && perm[2] === 1 &&
          !flip[0] && !flip[1] && !flip[2];
        out.push({ perm: perm, flip: flip, isV021: isV021, worst: +worst.toFixed(2),
          sumMin: +sumMin.toFixed(2), margins: margins, samples: null });
      }
    }
    if (samples && samples.length) {
      var keep = this.perm, keepF = this.flip;
      for (var ci = 0; ci < out.length; ci++) {
        this.perm = out[ci].perm; this.flip = out[ci].flip;
        var hit = 0;
        for (var si = 0; si < samples.length; si++) {
          var s = samples[si];
          // 0.35 m probe: big enough to land in a leaf, small enough to stay
          // inside one cluster's worth of the grid.
          if (this.boxClusters(s[0] - 0.35, s[1] - 0.35, s[2] - 0.35,
            s[0] + 0.35, s[1] + 0.35, s[2] + 0.35)) hit++;
        }
        out[ci].samples = +(hit / samples.length).toFixed(4);
      }
      this.perm = keep; this.flip = keepF;
      out.sort(function (a, b) {
        return (b.samples - a.samples) || (b.sumMin - a.sumMin) || (b.isV021 - a.isV021);
      });
    } else {
      out.sort(function (a, b) { return (b.sumMin - a.sumMin) || (b.isV021 - a.isV021); });
    }
    return out;
  };

  // =========================================================================
  // hookMesh  --  port of v0.21 `Qn(mesh, clusters, vis)`  (v021r:2754-2794)
  // =========================================================================
  //
  // Saves geometry.drawRange.count in onBeforeRender, zeroes it when no cluster
  // of this mesh is visible, restores it in onAfterRender.
  //
  // DEVIATION 1: v0.21 restores ONLY in onAfterRender. If anything throws
  // between the two callbacks, or the mesh leaves the render list after being
  // culled, the count stays 0 and the mesh is permanently invisible. Here the
  // saved count is self-healed at the top of the next onBeforeRender, and every
  // hooked mesh is reachable from restoreAll() / unhookAll().
  // DEVIATION 2: installing twice is a no-op (userData.__cs2vis guard), so the
  // entity sweep and the leftover sweep cannot stack hooks on one mesh.
  var HOOK_KEY = "__cs2vis";
  var hooked = [];   // every mesh currently carrying a PVS hook

  /**
   * The master gate. Until `state.gate` is true, no hook may cull anything:
   * onBeforeRender returns right after the self-heal. This is what makes the
   * "self-test first" ordering safe -- the hooks exist (so the entity and mesh
   * lists are known) but they are inert until the structure has been shown to
   * agree with the live map.
   */
  function gateOpen() { return state.gate === true; }

  function hookMesh(mesh, clusters, vis) {
    if (!mesh || !mesh.isMesh || !clusters || !vis) return false;
    var prev = mesh.userData && mesh.userData[HOOK_KEY];
    if (prev && prev.vis === vis) {
      prev.clusters = clusters;   // re-hooked for the same map: refresh the list
      return false;
    }
    if (prev) unhookMesh(mesh);

    var prevBefore = mesh.onBeforeRender;
    var prevAfter = mesh.onAfterRender;
    var saved = -1;
    var st = { vis: vis, clusters: clusters, mesh: mesh, saved: -1,
      drew: false, culled: false, wasVisible: true, hardHidden: false };

    mesh.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
      if (saved !== -1) { geometry.drawRange.count = saved; saved = -1; }  // self-heal
      if (prevBefore) prevBefore.call(this, renderer, scene, camera, geometry, material, group);
      if (!gateOpen()) return;
      if (!camera || !camera.isPerspectiveCamera) return;
      st.drew = false; st.culled = false;
      var bits = vis.bitsFor(camera);
      st.drew = true;
      if (bits && !Pvs.anyVisible(clusters, bits)) {
        saved = geometry.drawRange.count;
        geometry.drawRange.count = 0x0;
        st.culled = true;
      }
    };
    mesh.onAfterRender = function (renderer, scene, camera, geometry, material, group) {
      if (saved !== -1) { geometry.drawRange.count = saved; saved = -1; }
      if (prevAfter) prevAfter.call(this, renderer, scene, camera, geometry, material, group);
    };

    mesh.userData[HOOK_KEY] = st;
    hooked.push(st);
    return true;
  }

  function unhookMesh(mesh) {
    var st = mesh.userData && mesh.userData[HOOK_KEY];
    if (!st) return false;
    if (st.saved !== -1 && st.mesh.geometry) st.mesh.geometry.drawRange.count = st.saved;
    st.saved = -1;
    if (st.hardHidden) { st.mesh.visible = st.wasVisible; st.hardHidden = false; }
    delete mesh.userData[HOOK_KEY];
    var idx = hooked.indexOf(st);
    if (idx >= 0) hooked.splice(idx, 1);
    return true;
  }

  /** Restore every mesh's drawRange (and visible flag), leaving hooks installed. */
  function restoreAll() {
    var n = 0;
    for (var i = 0; i < hooked.length; i++) {
      var st = hooked[i];
      if (st.saved !== -1 && st.mesh.geometry) {
        st.mesh.geometry.drawRange.count = st.saved;
        st.saved = -1; n++;
      }
      if (st.hardHidden) { st.mesh.visible = st.wasVisible; st.hardHidden = false; n++; }
    }
    return n;
  }

  /** Remove every hook. Fully reverts this subsystem on the meshes. */
  function unhookAll() {
    var n = 0;
    for (var i = hooked.length - 1; i >= 0; i--) {
      if (unhookMesh(hooked[i].mesh)) n++;
    }
    return n;
  }

  /**
   * HARD CULL (not in v0.21; see section 6). A pre-render pass that maintains
   * mesh.visible from the PVS so the object is dropped from the render list and
   * the draw call never happens. DEFAULT OFF -- it writes the shared `visible`
   * channel. One frame of latency is inherent: the decision for frame N is
   * taken during frame N and applies to frame N+1.
   */
  function hardCullPass(camera) {
    if (!modes.hide || !state.enabled || !state.vis || !gateOpen()) return null;
    var bits = camera && camera.isPerspectiveCamera ? state.vis.bitsFor(camera) : null;
    var hidden = 0, shown = 0, drawn = 0;
    for (var i = 0; i < hooked.length; i++) {
      var st = hooked[i], m = st.mesh;
      // Only ever re-show a mesh WE hid. Anything else visible=false belongs
      // to the game (broken props, hidden agents, ...) and is left alone.
      if (st.hardHidden) { m.visible = st.wasVisible; st.hardHidden = false; shown++; }
      if (!bits) continue;
      if (!Pvs.anyVisible(st.clusters, bits)) {
        if (m.visible) { st.wasVisible = true; m.visible = false; st.hardHidden = true; }
        else if (st.hardHidden) { /* already */ } else { st.wasVisible = false; }
        hidden++;
      } else if (m.visible) drawn++;
    }
    state.watchdog.lastTotal = drawn;
    state.watchdog.lastCulled = hidden;
    return { drawn: drawn, hidden: hidden, bits: !!bits };
  }

  // =========================================================================
  // worldBoxClusters  --  port of v0.21 `lb(vis, bbox, matrixWorld)`
  //                   (v021r:52699-52725)
  // =========================================================================
  // Transforms the 8 corners of a local AABB by matrixWorld, takes the world
  // AABB, and asks the structure which clusters it covers. null => do not cull.
  function worldBoxClusters(vis, bbox, matrixWorld) {
    if (!vis || !bbox || !matrixWorld) return null;
    var minX = Infinity, minY = Infinity, minZ = Infinity;
    var maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    var e = matrixWorld.elements;
    for (var k = 0; k < 0x8; k++) {
      var cx = k & 0x1 ? bbox.max.x : bbox.min.x;
      var cy = k & 0x2 ? bbox.max.y : bbox.min.y;
      var cz = k & 0x4 ? bbox.max.z : bbox.min.z;
      // v0.21: cb.set(cx,cy,cz).applyMatrix4(m), inlined so this file needs no
      // THREE import (the game has no global THREE; three is a module chunk).
      var px = e[0] * cx + e[4] * cy + e[8] * cz + e[12];
      var py = e[1] * cx + e[5] * cy + e[9] * cz + e[13];
      var pz = e[2] * cx + e[6] * cy + e[10] * cz + e[14];
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
      if (pz < minZ) minZ = pz;
      if (pz > maxZ) maxZ = pz;
    }
    if (!isFinite(minX) || !isFinite(maxX)) return null;
    return vis.boxClusters(minX, minY, minZ, maxX, maxY, maxZ);
  }

  // =========================================================================
  // cullEntityManager  --  port of v0.21 `ur.cullWith(vis)`  (v021r:2892-2912)
  // =========================================================================
  // For every map entity, take the world AABB of its object tree, expand it by
  // 0.25 m, and hook every mesh inside with the resulting cluster list.
  function cullEntityManager(entMgr, vis) {
    var stats = { entities: 0, hooked: 0, empty: 0, outside: 0 };
    if (!entMgr || !vis) return stats;
    var ents = entMgr.ents || [];
    for (var n = 0; n < ents.length; n++) {
      var ent = ents[n];
      if (!ent || !ent.obj) continue;
      stats.entities++;
      var box = computeObjectBox(ent.obj);
      if (!box || box.isEmpty()) { stats.empty++; continue; }
      box.expandByScalar(CFG.ENT_EXPAND);           // v0.21: t["expandByScalar"](.25)
      var clusters = vis.boxClusters(
        box.min.x, box.min.y, box.min.z,
        box.max.x, box.max.y, box.max.z);
      if (!clusters) { stats.outside++; continue; }  // outside the grid -> do not cull
      var self = stats;
      ent.obj.traverse(function (child) {
        if (child.isMesh && hookMesh(child, clusters, vis)) self.hooked++;
      });
    }
    return stats;
  }

  /** Local Box3 equivalent, so this file needs no THREE import. */
  function computeObjectBox(obj) {
    var minX = Infinity, minY = Infinity, minZ = Infinity;
    var maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    obj.updateMatrixWorld(true);
    obj.traverse(function (o) {
      if (!o.isMesh || !o.geometry) return;
      var g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      var bb = g.boundingBox;
      if (!bb || bb.isEmpty()) return;
      var e = o.matrixWorld.elements;
      for (var k = 0; k < 0x8; k++) {
        var cx = k & 0x1 ? bb.max.x : bb.min.x;
        var cy = k & 0x2 ? bb.max.y : bb.min.y;
        var cz = k & 0x4 ? bb.max.z : bb.min.z;
        var px = e[0] * cx + e[4] * cy + e[8] * cz + e[12];
        var py = e[1] * cx + e[5] * cy + e[9] * cz + e[13];
        var pz = e[2] * cx + e[6] * cy + e[10] * cz + e[14];
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        if (pz < minZ) minZ = pz;
        if (pz > maxZ) maxZ = pz;
      }
    });
    if (!isFinite(minX)) return null;
    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      isEmpty: function () { return minX > maxX; },
      expandByScalar: function (s) {
        minX -= s; minY -= s; minZ -= s; maxX += s; maxY += s; maxZ += s;
        return this;
      },
    };
  }

  // =========================================================================
  // sweepLeftoverMeshes  --  port of the leftover-mesh sweep
  //                        (v021r:53154-53171)
  // =========================================================================
  // v0.21:
  //   root.traverse(e => e.isMesh && e.name !== "cs2batch" && !e.isSkinnedMesh
  //                   && !e.isInstancedMesh && list.push(e))
  //   then per mesh: geometry.boundingBox ||= computeBoundingBox();
  //                  n = lb(vis, bb, matrixWorld); n && (Qn(m,n,vis), v++)
  //
  // DEVIATION: isBatchedMesh is also skipped (three r160 has the flag; the
  // batching layer may set it) and so is anything the entity sweep already
  // hooked, so the two consumers can never stack hooks on one mesh.
  function sweepLeftoverMeshes(root, vis) {
    var res = { candidates: 0, noGeometry: 0, outsideGrid: 0, hooked: 0, skipped: 0 };
    if (!root || !vis) return res;
    var list = [];
    root.updateMatrixWorld(true);
    root.traverse(function (m) {
      if (!m.isMesh) return;
      if (m.isSkinnedMesh || m.isInstancedMesh || m.isBatchedMesh) { res.skipped++; return; }
      if (m.name && CFG.BATCH_NAMES.indexOf(m.name) >= 0) { res.skipped++; return; }
      if (m.userData && m.userData[HOOK_KEY]) return;   // entity sweep owns it
      list.push(m);
    });
    for (var i = 0; i < list.length; i++) {
      var mesh = list[i];
      res.candidates++;
      var g = mesh.geometry;
      if (!g || !g.attributes || !g.attributes.position) { res.noGeometry++; continue; }
      if (!g.boundingBox) g.computeBoundingBox();
      if (!g.boundingBox || g.boundingBox.isEmpty()) { res.noGeometry++; continue; }
      var clusters = worldBoxClusters(vis, g.boundingBox, mesh.matrixWorld);
      if (!clusters) { res.outsideGrid++; continue; }
      if (hookMesh(mesh, clusters, vis)) res.hooked++;
    }
    return res;
  }

  // =========================================================================
  // BOT OCCLUSION  --  v0.21 `Hh` (v021r:40751-40768) + `Yg.cullAgents`
  //                  (v021r:43666-43693)
  // =========================================================================
  // DEFAULT OFF. This is a GAMEPLAY change, not a rendering optimisation: it
  // hides bots that are inside the view frustum but outside the camera's PVS.
  //
  // !! COUPLING WARNING -- READ THIS BEFORE ENABLING !!
  // It is applied by writing agent.root.visible = false. In OUR build
  // main.js:52989 (_corpseCapsules, reached from the hit/raycast path at
  // :53033) reads
  //     if (!n || !n["bones"] || !n["root"] || !n["root"]["visible"]) return;
  // so an agent whose root.visible is false is ALSO skipped as a hit target and
  // contributes no corpse capsule. Enabling bot occlusion therefore changes
  // both what you can SEE and what you can SHOOT at, for bots and for the
  // networked players in the same pool. It is wrapped, never rewritten, and
  // audit(camera) reports exactly what it WOULD do while mutating nothing.
  //
  // Port of Hh(ent, vis, bits, dynCast, y):
  //   memo key = round(x*2)*100000 + round(y*2)*10000 + round(z*2) + (dyn?0.5:0)
  //   probe radius 0.8 m, +0.8 m more when dynCast is on
  //   box (x-n-o, y-0.3-o, z-n-o) .. (x+n+o, y+2.2, z+n+o)
  //   (a null cluster list means "unknown" and anyVisible() returns true)
  function botProbeVisible(ent, vis, bits, dynCast, y) {
    var key = Math.round(ent.x * 2) * 0x5f5e100 +
      Math.round(y * 2) * 0x2710 +
      Math.round(ent.z * 2) +
      (dynCast ? 0.5 : 0x0);
    if (ent._visKey !== key) {
      ent._visKey = key;
      var n = 0.8, o = dynCast ? 0x8 : 0x0;
      ent._visList = vis.boxClusters(
        ent.x - n - o, y - 0.3 - o, ent.z - n - o,
        ent.x + n + o, y + 2.2, ent.z + n + o);
    }
    return Pvs.anyVisible(ent._visList, bits);
  }

  // =========================================================================
  // STATE + INSTALL
  // =========================================================================
  var state = {
    enabled: enabled,
    modes: modes,
    installed: false,
    game: null,
    vis: null,
    gate: false,       // master cull gate; nothing is culled until the self-test passes
    visByMap: {},      // map id -> Pvs | null ("failed / unavailable")
    pending: null,     // map id whose file is still in flight
    entityStats: null,
    sweepStats: null,
    fitReport: null,
    selfTest: null,    // last nearFieldCheck result
    passes: 0,
    fails: 0,
    watchdog: { badFrames: 0, tripped: false, lastCulled: 0, lastTotal: 0, frames: 0 },
    botPatch: null,
    reason: "not installed",
  };

  function disable(reason) {
    if (!state.enabled && !state.vis) return false;
    state.enabled = false;
    state.gate = false;
    state.reason = reason || "disabled";
    restoreAll();
    if (state.botPatch) uninstallBotOcclusion();
    log("DISABLED:", state.reason);
    return true;
  }
  function enable() {
    state.enabled = true;
    state.gate = false;      // re-arm: nothing is culled until the self-test re-passes
    state.passes = 0; state.fails = 0; state.selfTest = null;
    state.reason = "re-enabled, awaiting self-test";
    log("enabled (gate shut until the near-field self-test passes again)");
    return true;
  }

  /**
   * The over-cull watchdog. It measures only the meshes that ACTUALLY rendered
   * this frame (st.drew), because frustum-culled meshes never reach
   * onBeforeRender and their last-known value would otherwise go stale.
   */
  function tickWatchdog() {
    if (!CFG.WATCHDOG || !state.enabled || modes.hide) return;
    var total = 0, culled = 0, i, st;
    for (i = 0; i < hooked.length; i++) {
      st = hooked[i];
      if (st.drew) { total++; if (st.culled) culled++; }
    }
    state.watchdog.lastTotal = total;
    state.watchdog.lastCulled = culled;
    state.watchdog.frames++;
    if (total >= CFG.WATCHDOG_MIN_MESHES && culled / total > CFG.WATCHDOG_RATIO) {
      state.watchdog.badFrames++;
      if (state.watchdog.badFrames >= CFG.WATCHDOG_FRAMES && !state.watchdog.tripped) {
        state.watchdog.tripped = true;
        disable("watchdog: " + culled + "/" + total + " rendered meshes culled for " +
          CFG.WATCHDOG_FRAMES + " frames (> " + (CFG.WATCHDOG_RATIO * 100).toFixed(1) +
          "%) -- over-cull suspected");
      }
    } else {
      state.watchdog.badFrames = 0;
    }
    for (i = 0; i < hooked.length; i++) { hooked[i].drew = false; hooked[i].culled = false; }
  }

  function visUrlFor(mapId) {
    var single = Q.get("visurl");
    if (single) return single;
    return urlBase + mapId + "_vis.bin.gz";
  }

  /** Load (or reuse) the CVIS structure for a map. Never throws. */
  function loadVis(mapId) {
    if (mapId in state.visByMap) return Promise.resolve(state.visByMap[mapId]);
    var url = visUrlFor(mapId);
    state.pending = mapId;
    return Pvs.load(url).then(function (v) {
      state.visByMap[mapId] = v;
      state.pending = null;
      log("loaded " + url + " -> " +
        (v ? (v.clusters + " clusters, " + v.rowBytes + " B/row, " +
          v.pvsTail + " B trailer") : "null (no DecompressionStream)"));
      return v;
    }).catch(function (e) {
      state.visByMap[mapId] = null;
      state.pending = null;
      // v0.21 parity (v021r:53650): "[map] visibility skipped:" <message>
      console.warn("[map] visibility skipped:", e && e.message);
      state.reason = "load failed: " + (e && e.message);
      return null;
    });
  }

  // ---- runtime self-test ---------------------------------------------------
  /**
   * Sample up to `budget` real surface points from the live map subtree.
   * These are points that are DEFINITELY inside the map, so under the correct
   * axis mapping they must land in occupied leaves; under a rotated or
   * mirrored mapping most of them land in empty space. Containment alone
   * cannot detect handedness -- this can.
   */
  function sampleSurfacePoints(root, budget) {
    var pts = [];
    if (!root) return pts;
    var meshes = [];
    root.updateMatrixWorld(true);
    root.traverse(function (m) {
      if (m.isMesh && m.geometry && m.geometry.attributes &&
        m.geometry.attributes.position && m.geometry.attributes.position.array) {
        meshes.push(m);
      }
    });
    if (!meshes.length) return pts;
    var per = Math.max(1, Math.floor(budget / meshes.length));
    for (var i = 0; i < meshes.length && pts.length < budget; i++) {
      var m = meshes[i], pos = m.geometry.attributes.position;
      var e = m.matrixWorld.elements;
      var count = pos.count;
      var stride = Math.max(1, Math.floor(count / per));
      for (var v = 0; v < count && pts.length < budget; v += stride) {
        var x = pos.array[pos.itemSize * v],
          y = pos.itemSize > 1 ? pos.array[pos.itemSize * v + 1] : 0,
          z = pos.itemSize > 2 ? pos.array[pos.itemSize * v + 2] : 0;
        pts.push([
          e[0] * x + e[4] * y + e[8] * z + e[12],
          e[1] * x + e[5] * y + e[9] * z + e[13],
          e[2] * x + e[6] * y + e[10] * z + e[14],
        ]);
      }
    }
    return pts;
  }

  /**
   * Points 2-8 m in front of the camera are essentially never occluded, so a
   * healthy structure must report them visible. This is an INTERNAL
   * CONSISTENCY gate: it catches a wrong Xn, a corrupt table, a camera
   * outside the grid, and generally garbage. It is NOT a handedness or
   * permutation test -- bitsFor() and the probe boxes are both evaluated in
   * whatever frame is installed, so they stay mutually consistent under any
   * permutation (measured: all six score 275/275). The permutation evidence
   * is the occupancy test inside pickAxisMapping(); see section 3.
   *
   * `verdict === "skip"` means the camera was not in the table at all (e.g. the
   * load sequence still has it at the origin). That is NOT a failure, it is not
   * enough information, and the caller retries rather than counting it.
   */
  function nearFieldCheck(vis, camera) {
    if (!vis || !camera || !camera.matrixWorld) return { verdict: "skip", why: "no camera" };
    var e = camera.matrixWorld.elements;
    var px = e[0xc], py = e[0xd], pz = e[0xe];
    var r = [e[0], e[1], e[2]], u = [e[4], e[5], e[6]], f = [-e[8], -e[9], -e[10]];
    var bits = vis.bitsFor(camera);
    if (!bits) return { verdict: "skip", why: "no-bits", n: 0, hit: 0, rate: 0 };
    var n = 0, hit = 0, nearHit = 0, nearN = 0;
    var dists = [2, 3, 4, 6, 8];
    for (var a = -50; a <= 50; a += 10) {
      var ra = a * Math.PI / 180, sa = Math.sin(ra), ca = Math.cos(ra);
      for (var b = -20; b <= 20; b += 10) {
        var rb = b * Math.PI / 180, sb = Math.sin(rb), cb2 = Math.cos(rb);
        for (var d = 0; d < dists.length; d++) {
          var dd = dists[d];
          var dx = (f[0] * cb2 + r[0] * sa + u[0] * sb) * dd;
          var dy = (f[1] * cb2 + r[1] * sa + u[1] * sb) * dd;
          var dz = (f[2] * cb2 + r[2] * sa + u[2] * sb) * dd;
          var x = px + dx, y = py + dy, z = pz + dz;
          var cl = vis.boxClusters(x - 0.3, y - 0.3, z - 0.3, x + 0.3, y + 0.3, z + 0.3);
          var ok = Pvs.anyVisible(cl, bits);
          n++; if (ok) hit++;
          if (dd <= 3) { nearN++; if (ok) nearHit++; }
        }
      }
    }
    var rate = n ? hit / n : 0;
    var pass = rate >= CFG.NEARFIELD_MIN;
    return {
      verdict: pass ? "pass" : "fail",
      rate: +rate.toFixed(4), n: n, hit: hit,
      nearRate: nearN ? +(nearHit / nearN).toFixed(4) : null,
      why: pass
        ? (rate * 100).toFixed(1) + "% of " + n + " probe points 2-8 m in front read visible"
        : "only " + (rate * 100).toFixed(1) + "% of the " + n +
          " probe points 2-8 m in front read visible (need " +
          (CFG.NEARFIELD_MIN * 100).toFixed(0) + "%)",
    };
  }

  /**
   * The guard against a wrong Xn or a wrong axis permutation, which is the
   * failure mode that silently deletes a slab of the map. Returns
   * {ok:false, why} and culling must stay OFF when ok is false.
   */
  function verifyFit(vis, game) {
    var wb = null;
    var b = game && game._mapBounds;
    if (b && isFinite(b.minX) && isFinite(b.maxX)) {
      // our bounds shape: {minX, maxX, minZ, maxZ, maxY} + map.voidY/ceilY
      wb = {
        min: [b.minX, (game.map ? game.map.voidY : -20) + 2, b.minZ],
        max: [b.maxX, b.maxY != null ? b.maxY : (game.map ? game.map.ceilY : 30), b.maxZ],
      };
    } else if (game && game._mapRoot) {
      var box = computeObjectBox(game._mapRoot);
      if (box) wb = { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] };
    }
    if (!wb) return { ok: false, why: "no map bounds available" };

    var pts = sampleSurfacePoints(game && game._mapRoot, 3000);
    var cands = vis.pickAxisMapping(wb, pts);
    if (!cands.length) {
      return {
        ok: false, samples: pts.length,
        why: "the live map AABB does not fit inside the CVIS grid box under ANY of the 48 " +
          "axis mappings -- Xn or the axis order is wrong for this build",
        map: wb, gridCvis: { min: vis.min, size: vis.size },
      };
    }
    var best = cands[0];

    // No surface samples means no external reference to re-derive against, so
    // fail CLOSED rather than trusting the constant. In the real game
    // game._mapRoot always has geometry, so this only fires if the map failed
    // to build.
    if (!pts.length) {
      return {
        ok: false, samples: 0,
        why: "no map surface samples were available to re-derive the axis mapping " +
          "against -- failing closed rather than trusting the v0.21 constant",
        map: wb, gridCvis: { min: vis.min, size: vis.size },
      };
    }

    // SCALE SANITY. Containment does not catch a wrong Xn by itself -- a grid
    // that is far too large still contains the map trivially (measured: with
    // Xn = 1.0, ok came back true with 6 containing candidates). The edge has
    // to be a sane multiple of the map it is supposed to describe.
    var maxDim = Math.max(wb.max[0] - wb.min[0], wb.max[1] - wb.min[1], wb.max[2] - wb.min[2]);
    var edgeM = vis.size * CFG.XN;
    var ratio = maxDim > 0 ? edgeM / maxDim : Infinity;
    if (!(edgeM > 0) || !isFinite(ratio) || ratio > CFG.MAX_GRID_RATIO) {
      return {
        ok: false, samples: pts.length, gridEdgeM: edgeM, mapMaxDimM: maxDim, ratio: ratio,
        why: "the CVIS grid edge is " + edgeM.toFixed(1) + " m, " +
          (isFinite(ratio) ? ratio.toFixed(1) : "?") + "x the map's largest dimension (" +
          maxDim.toFixed(1) + " m), which exceeds the sane bound of " + CFG.MAX_GRID_RATIO +
          "x -- Xn is wrong for this build",
        map: wb, gridCvis: { min: vis.min, size: vis.size },
      };
    }

    vis.perm = best.perm;
    vis.flip = best.flip;
    vis.permSource = best.isV021
      ? "v0.21 mapping [2,0,1], re-confirmed against this map: worst face margin " +
        best.worst + " m, " + (best.samples * 100).toFixed(1) + "% of " + pts.length +
        " real surface points land in occupied leaves"
      : "RE-DERIVED perm " + best.perm.join(",") + " flip " + best.flip.map(function (b) { return b ? 1 : 0; }).join("") +
        " (DIFFERS from v0.21's [2,0,1]): worst face margin " + best.worst +
        " m, " + (best.samples * 100).toFixed(1) + "% surface hit rate";
    return {
      ok: best.samples >= CFG.SURFACE_HIT_MIN, perm: best.perm, flip: best.flip,
      isV021: !!best.isV021, worstMarginM: best.worst, sumMinMarginM: best.sumMin,
      gridEdgeM: +edgeM.toFixed(1), mapMaxDimM: +maxDim.toFixed(1), gridRatio: +ratio.toFixed(2),
      surfaceHitRate: best.samples, samples: pts.length,
      candidates: cands.slice(0, 6).map(function (c) {
        return { perm: c.perm.join(","), flip: c.flip.map(function (b) { return b ? 1 : 0; }).join(""),
          worstM: c.worst, sumMinM: c.sumMin, surfaceHit: c.samples };
      }),
      map: wb, grid: vis.worldBox(), why: "",
    };
  }

  /**
   * Apply the subsystem to a freshly loaded map. Mirrors v0.21, which does
   *   this.map.vis = n.vis || null;      (v021r:59787)
   *   this.mapEnts.cullWith(this.map.vis) (v021r:59803)
   * between building mapEnts and setting anisotropy -- i.e. at our main.js
   * :52204 and :52205. Our build has no hook there, so this is called from a
   * loadMap wrapper instead; game.mapEnts is reachable at runtime, so no edit
   * to main.js is required.
   */
  function installAfterMapLoad(game, vis) {
    if (!game || !vis) return null;
    unhookAll();                       // a map change must not stack hooks
    // our main.js:52176-52190 has no "vis" key; add one so the same shape as
    // v0.21 (game.map.vis) is available to anything that expects it.
    if (game.map) game.map.vis = vis;

    var fit = verifyFit(vis, game);
    state.fitReport = fit;
    if (!fit.ok) {
      warn("REFUSING TO CULL:", fit.why || ("surface hit rate " + fit.surfaceHitRate));
      state.reason = "fit check failed: " + (fit.why || "low surface hit rate");
      return fit;
    }
    log("axis mapping:", vis.permSource, "| grid " +
      JSON.stringify(fit.grid.min.map(function (v) { return +v.toFixed(1); })) + ".." +
      JSON.stringify(fit.grid.max.map(function (v) { return +v.toFixed(1); })));

    var out = { fit: fit, sweep: null, ents: null, totalHooked: 0 };

    // 1) map-entity PVS  (ur.cullWith, v021r:2892)
    if (modes.ents && game.mapEnts) {
      out.ents = cullEntityManager(game.mapEnts, vis);
      state.entityStats = out.ents;
      log("entity PVS: " + out.ents.hooked + " meshes over " + out.ents.entities +
        " entities (" + out.ents.empty + " empty bounds, " + out.ents.outside + " outside grid)");
    }

    // 2) leftover (non-batched) map mesh PVS  (v021r:53154-53171)
    if (modes.meshes && game._mapRoot) {
      out.sweep = sweepLeftoverMeshes(game._mapRoot, vis);
      state.sweepStats = out.sweep;
      log("leftover sweep: " + out.sweep.candidates + " candidates, " +
        out.sweep.hooked + " hooked, " + out.sweep.outsideGrid + " outside the CVIS grid, " +
        out.sweep.noGeometry + " without a position attribute, " +
        out.sweep.skipped + " skipped (batched/skinned/instanced)");
    }

    state.vis = vis;
    state.selfTest = null;             // re-armed for the first live camera
    state.gate = false;                 // and the gate is shut again
    state.passes = 0; state.fails = 0;
    state.reason = "hooked, awaiting the near-field self-test";
    out.totalHooked = hooked.length;
    log("total hooked meshes: " + out.totalHooked + " (inert until the self-test passes)");
    return out;
  }

  // ---- loadMap wrapper -----------------------------------------------------
  var origLoadMap = null;
  function installLoadMapHook(game) {
    if (game.__cs2visLoadMapHooked) return false;
    origLoadMap = game.loadMap;
    if (typeof origLoadMap !== "function") return false;
    game.loadMap = function (mapId) {
      var r = origLoadMap.apply(this, arguments);
      try { onMapLoaded(this, mapId); } catch (e) { warn("onMapLoaded:", e); }
      return r;
    };
    game.__cs2visLoadMapHooked = true;
    return true;
  }

  function onMapLoaded(game, mapId) {
    state.game = game;
    if (!state.enabled) return;
    if (mapId in state.visByMap) {
      var known = state.visByMap[mapId];
      if (known) installAfterMapLoad(game, known);
      else log("no visibility structure for", mapId, "-", state.reason);
      return;
    }
    loadVis(mapId).then(function (vis) {
      if (!vis) return;
      // the map may have changed while the file was in flight
      if (game.map && game.map.id === mapId) {
        installAfterMapLoad(game, vis);
        if (modes.bots) installBotOcclusion(game);
      }
    });
  }

  // ---- bot occlusion (default OFF) -----------------------------------------
  function installBotOcclusion(game) {
    var botMgr = game && game.botMgr;
    if (!botMgr || typeof botMgr.cullAgents !== "function") {
      warn("bot occlusion requested but game.botMgr.cullAgents is unavailable");
      return false;
    }
    if (state.botPatch && state.botPatch.botMgr === botMgr) return true;
    var orig = botMgr.cullAgents;
    state.botPatch = { botMgr: botMgr, orig: orig };
    botMgr.cullAgents = function (camera) {
      // v0.21's own frustum result first (main.js:36632-36657), untouched.
      var res = orig.apply(this, arguments);
      if (!modes.bots || !state.enabled) return res;
      var vis = state.vis;
      var bits = (vis && camera && camera.isPerspectiveCamera) ? vis.bitsFor(camera) : null;
      if (!bits) return res;         // no PVS -> leave the frustum result alone
      var dyn = !!game.dynCast;
      var pool = this.bots || [], np = this.networkPlayers || [];
      for (var i = 0; i < pool.length + np.length; i++) {
        var b = i < pool.length ? pool[i] : np[i - pool.length];
        var ag = b && b.cs2Agent;
        if (!ag || !ag.root || !b.alive) continue;
        if (game._specHidden === b) continue;   // cullAgents already handled it
        if (!ag.root.visible) continue;         // already frustum-culled: leave it
        var y = b._visY == null ? b.y : b._visY;
        ag.root.visible = botProbeVisible(b, vis, bits, dyn, y);
      }
      return res;
    };
    log("bot occlusion ENABLED (gameplay change; root.visible is also read by " +
      "_corpseCapsules at main.js:52989)");
    return true;
  }

  function uninstallBotOcclusion() {
    if (!state.botPatch) return false;
    var p = state.botPatch;
    if (p.botMgr.cullAgents !== p.orig) p.botMgr.cullAgents = p.orig;
    state.botPatch = null;
    log("bot occlusion disabled");
    return true;
  }

  /** Read-only: what WOULD bot occlusion hide right now? Mutates nothing. */
  function auditBots(camera) {
    var game = state.game;
    if (!game || !game.botMgr) return null;
    var vis = state.vis;
    var bits = (vis && camera && camera.isPerspectiveCamera) ? vis.bitsFor(camera) : null;
    if (!bits) return { ok: false, why: "no visibility bitset for this camera" };
    var dyn = !!game.dynCast;
    var pool = game.botMgr.bots || [], np = game.botMgr.networkPlayers || [];
    var rows = [];
    for (var i = 0; i < pool.length + np.length; i++) {
      var b = i < pool.length ? pool[i] : np[i - pool.length];
      var ag = b && b.cs2Agent;
      if (!ag || !b.alive) continue;
      var y = b._visY == null ? b.y : b._visY;
      var v2 = botProbeVisible(b, vis, bits, dyn, y);
      rows.push({
        x: +b.x.toFixed(2), y: +y.toFixed(2), z: +b.z.toFixed(2),
        rootVisibleNow: !!ag.root.visible, rootVisibleAfterPvs: v2,
        clusters: b._visList ? b._visList.length : 0,
      });
    }
    var wouldHide = rows.filter(function (r) { return r.rootVisibleNow && !r.rootVisibleAfterPvs; }).length;
    return { ok: true, dynCast: dyn, total: rows.length, wouldHide: wouldHide, rows: rows };
  }

  // =========================================================================
  // EXPORTED API
  // =========================================================================
  var API = {
    version: "1.1.0",
    portedFrom: "v0.21 (.port/v021/main.js) -> clutcher-deploy 3cb27010",
    CFG: CFG,
    Pvs: Pvs,
    anyVisible: Pvs.anyVisible,
    worldBoxClusters: worldBoxClusters,
    hookMesh: hookMesh,
    unhookMesh: unhookMesh,
    unhookAll: unhookAll,
    restoreAll: restoreAll,
    cullEntityManager: cullEntityManager,
    sweepLeftoverMeshes: sweepLeftoverMeshes,
    botProbeVisible: botProbeVisible,
    sampleSurfacePoints: sampleSurfacePoints,
    nearFieldCheck: nearFieldCheck,
    load: loadVis,
    /** @returns {Pvs|null} the structure for the current (or named) map */
    get: function (mapId) {
      var id = mapId || (state.game && state.game.map && state.game.map.id);
      if (id && (id in state.visByMap)) return state.visByMap[id];
      return state.vis;
    },
    /** The bitset for a camera, or null. null ALWAYS means "do not cull". */
    bitsFor: function (camera) { return state.vis ? state.vis.bitsFor(camera) : null; },
    /** Re-apply to the current map (after a manual install or a map change). */
    apply: function () {
      if (!state.game) return null;
      return installAfterMapLoad(state.game, state.vis);
    },
    install: installLoadMapHook,
    installAfterMapLoad: installAfterMapLoad,
    /**
     * Re-run the fit check. Both arguments are optional and default to the
     * live ones; they are parameters so the check can be exercised against a
     * synthetic map/structure without touching a running game.
     * @returns {{ok:boolean, why:string}}
     */
    verifyFit: function (game, vis) { return verifyFit(vis || state.vis, game || state.game); },
    /**
     * Read-only probe: from `camera`, are points 2-8 m in front reported
     * visible? An INTERNAL-CONSISTENCY / scale / garbage gate -- NOT a
     * permutation test (see section 3). Takes the camera ONLY; the structure
     * comes from state.vis.
     */
    probeNearField: function (camera) { return nearFieldCheck(state.vis, camera); },
    disable: disable,
    enable: enable,
    enableBots: function () { modes.bots = true; return installBotOcclusion(state.game); },
    disableBots: uninstallBotOcclusion,
    setHardCull: function (on) { modes.hide = !!on; if (!on) restoreAll(); return modes.hide; },
    audit: auditBots,
    tickWatchdog: tickWatchdog,
    hardCullPass: hardCullPass,
    hookedCount: function () { return hooked.length; },
    config: function (patch) {
      for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) CFG[k] = patch[k];
      return CFG;
    },
    state: state,
  };
  window.__CS2_VIS__ = API;

  if (!enabled) {
    state.reason = "?vis=0";
    log("disabled by ?vis=0");
    return;
  }

  // ---- auto-install once window.game exists --------------------------------
  function tryInstall() {
    var game = window.game;                        // main.js:49801
    if (!game) return false;
    state.game = game;
    if (!installLoadMapHook(game)) {
      if (!state.installed) {
        state.installed = true;
        log("loadMap is not callable -- will keep checking");
      }
      return false;
    }
    state.installed = true;
    log("attached to window.game (map=" + (game.map && game.map.id) +
      ", state=" + game.state + ")");
    if (game.map && game.map.id) onMapLoaded(game, game.map.id);
    return true;
  }
  if (!tryInstall()) {
    var tries = 0;
    var iv = setInterval(function () {
      if (tryInstall() || ++tries > 900) clearInterval(iv);
    }, 100);
  }

  // ---- per-frame driver: self-test gate, hard cull, watchdog --------------
  (function drive() {
    requestAnimationFrame(function loop() {
      try {
        var game = state.game;
        if (game && state.enabled && state.vis && game.renderer) {
          var cam = game._topCam || game.camera;
          // The gate is shut on every map load. Nothing is culled until the
          // near-field probe has passed NEARFIELD_PASSES times in a row with a
          // REAL bitset (a null bitset means "not enough information", and is
          // retried, never counted as a pass or a failure). NEARFIELD_FAILS
          // consecutive valid failures shut culling down for good.
          if (!state.gate) {
            var nf = nearFieldCheck(state.vis, cam);
            state.selfTest = nf;
            if (nf.verdict === "pass") {
              state.passes++; state.fails = 0;
              if (state.passes >= CFG.NEARFIELD_PASSES) {
                state.gate = true;
                log("near-field self-test PASSED x" + state.passes + ": " +
                  (nf.rate * 100).toFixed(1) + "% of " + nf.n +
                  " probe points 2-8 m in front read visible" +
                  (nf.nearRate != null
                    ? " (" + (nf.nearRate * 100).toFixed(1) + "% within 3 m)" : "") +
                  " -- CULLING ENABLED");
              }
            } else if (nf.verdict === "fail") {
              state.fails++; state.passes = 0;
              if (state.fails >= CFG.NEARFIELD_FAILS) {
                disable("near-field self-test failed " + state.fails + "x: " + nf.why);
              }
            }
          }
          if (state.enabled && modes.hide) hardCullPass(cam);
          if (state.enabled && !modes.hide) tickWatchdog();
        }
      } catch (e) { warn("driver error", e); }
      requestAnimationFrame(loop);
    });
  })();
})();
