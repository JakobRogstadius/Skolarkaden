/* Bounded, shared sprite frames. Movement and attack direction stay continuous;
   only small changes within the illustration are sampled into reusable images. */
(function(root) {
  'use strict';
  const G = root.Starlight.Glantan, A = G.Art, ATTACK_FRAMES = 12, IDLE_FRAMES = 8;
  class SpriteCache {
    constructor(limit = 64 * 1024 * 1024) {
      this.limit = limit; this.bytes = 0; this.entries = new Map(); this.scale = 1;
    }
    clear() {
      for (const entry of this.entries.values()) entry.canvas.width = entry.canvas.height = 0;
      this.entries.clear(); this.bytes = 0;
    }
    beginFrame() { this.builds = 0; }
    image(key, width, height, paint) {
      let entry = this.entries.get(key);
      if (entry) { this.entries.delete(key); this.entries.set(key, entry); }
      else {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        paint(canvas.getContext('2d'));
        entry = { canvas, bytes: canvas.width * canvas.height * 4 };
        while (this.entries.size && this.bytes + entry.bytes > this.limit) {
          const oldest = this.entries.keys().next().value, discarded = this.entries.get(oldest);
          this.bytes -= discarded.bytes; discarded.canvas.width = discarded.canvas.height = 0; this.entries.delete(oldest);
        }
        this.entries.set(key, entry); this.bytes += entry.bytes;
      }
      return entry;
    }
    draw(c, key, bounds, resolution, paint) {
      const [x,y,width,height] = bounds;
      const entry = this.image(key + ':' + resolution, Math.ceil(width * resolution), Math.ceil(height * resolution), context => {
        context.scale(resolution,resolution); context.translate(-x,-y); paint(context);
      });
      c.drawImage(entry.canvas, ...bounds);
    }
    resolution(scale = 1) { return Math.min(4, Math.max(1, Math.ceil(this.scale * scale * 2) / 2)); }
    body(c, kind, unit, w, time, reduced, pose, scale = 1) {
      const type = unit.classId || unit.type || 'skeleton', branch = w.choices[unit.classId] || '';
      const boss = unit.boss || type === 'guardian';
      const walking = kind !== 'monster' && !!unit.route?.length, bannerUnit = type === 'warrior' && branch === 'banner';
      const moving = !reduced && (kind === 'monster' || walking || bannerUnit);
      const rate = walking || type === 'nightwing' ? 11 : bannerUnit ? 3 : boss ? 3.5 : 7;
      const phase = ((time * rate + unit.id) % (Math.PI * 2)) / (Math.PI * 2);
      const count = reduced ? 1 : pose ? ATTACK_FRAMES : moving ? IDLE_FRAMES : 1;
      const frame = reduced ? 0 : pose ? Math.min(ATTACK_FRAMES - 1,Math.floor(pose.p * ATTACK_FRAMES)) : moving ? Math.floor(phase * IDLE_FRAMES) : 0;
      const resolution = this.resolution(scale);
      const key = ['body',kind,type,branch,!!unit.monster,unit.rank >= 3,!!boss,reduced,pose?.kind || (walking && !reduced ? 'walk' : 'idle'),resolution].join(':');
      const bounds = type === 'warrior' ? [-24,-61,62,70] : ['mage','necromancer','binder','mender','husher'].includes(type) ? [-26,-67,72,77] : type === 'nightwing' ? [-32,-54,64,64] : type === 'guardian' ? [-26,-55,52,71] : kind === 'skeleton' ? [-18,-45,54,55] : [-24,-50,68,62];
      // Immutable animation strips avoid hundreds of independent canvas textures
      // and expensive copy-on-write snapshots when a source canvas changes.
      // Warm at most two new strips per displayed frame; use the vector body
      // temporarily for the rest, so a new army does not stall to build atlases.
      if (!this.entries.has(key) && this.builds >= 2) { A[kind + 'Body'](c,unit,w,time,reduced,pose); return pose?.power || 0; }
      const [x,y,width,height] = bounds, fw = Math.ceil(width * resolution), fh = Math.ceil(height * resolution), columns = Math.min(4,count);
      if (fw * fh * count * 4 > this.limit) { A[kind + 'Body'](c,unit,w,time,reduced,pose); return pose?.power || 0; }
      const entry = this.image(key, fw * columns, fh * Math.ceil(count / columns), context => {
        this.builds = (this.builds || 0) + 1;
        for (let i=0;i<count;i++) {
          const p = pose ? reduced ? .4 : (i + .5) / ATTACK_FRAMES : 0, power = Math.sin(p * Math.PI);
          const wave = moving || pose ? Math.sin((pose ? p : i / IDLE_FRAMES) * Math.PI * 2) : 0;
          const walk = walking && !pose && !reduced ? wave : 0, banner = bannerUnit && !reduced ? wave : 0;
          const bob = kind === 'monster' && !pose ? wave * (boss ? .65 : 1.5) : 0, wing = type === 'nightwing' && !reduced ? wave * 7 : 0;
          const sampled = pose && { ...pose, p, power, swing: power * 1.8, draw: Math.max(0, 1 - p / .35) };
          const illustrated = Object.assign(Object.create(unit), { artWalk: walk, artBanner: banner, artBob: bob, artWing: wing });
          const sx = i % columns * fw, sy = Math.floor(i / columns) * fh;
          context.save(); context.beginPath(); context.rect(sx,sy,fw,fh); context.clip();
          context.translate(sx,sy); context.scale(resolution,resolution); context.translate(-x,-y);
          A[kind + 'Body'](context, illustrated, w, time, reduced, sampled);
          context.restore();
        }
      });
      c.drawImage(entry.canvas, frame % columns * fw, Math.floor(frame / columns) * fh, fw, fh,...bounds);
      return pose ? Math.sin((reduced ? .4 : (frame + .5) / ATTACK_FRAMES) * Math.PI) : 0;
    }
    building(c, b, w, time) {
      // The castle's moving bell and flag remain continuous. All other building
      // bodies are static, including the beacon's expensive light halo.
      if (b.type === 'castle' && b.hp > 0) { A.building(c,b,w,time); return; }
      const key = ['building',b.type,b.w,b.h,b.hp > 0 ? 'alive' : b.id].join(':');
      c.save(); c.translate(b.x * A.tile,b.y * A.tile);
      this.draw(c,key,[-90,-110,180,160],this.resolution(), context => A.building(context,{...b,x:0,y:0},w,time,true));
      if (b.type === 'house' && b.hp > 0) A.houseSmoke(c,time);
      c.restore();
    }
  }
  G.SpriteCache = SpriteCache;
})(globalThis);
