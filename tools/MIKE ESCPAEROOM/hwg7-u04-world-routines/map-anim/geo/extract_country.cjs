// node extract_country.cjs <geo.js> <country name> <lon shift> <out.geojson>
// Natural Earth (public domain) outline of one country, shifted in longitude, as a GeoJSON set for a scene's "geojson".
const fs = require('fs'), vm = require('vm');
const [, , geo, name, shift, out] = process.argv;
const ctx = { window: {}, self: {} }; ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx); vm.runInContext(fs.readFileSync(geo, 'utf8'), ctx);
const topo = ctx.KZGEO.countries, tj = ctx.topojson || ctx.window.topojson;
const fc = tj.feature(topo, topo.objects[Object.keys(topo.objects)[0]]);
const f = fc.features.find(x => x.properties && x.properties.name === name);
if (!f) throw new Error('not found: ' + name);
const mv = c => typeof c[0] === 'number' ? [Math.round((c[0] + Number(shift)) * 1000) / 1000, Math.round(c[1] * 1000) / 1000] : c.map(mv);
const g = { type: 'FeatureCollection', features: [{ type: 'Feature', id: f.id, properties: { name }, geometry: { type: f.geometry.type, coordinates: mv(f.geometry.coordinates) } }] };
fs.writeFileSync(out, JSON.stringify(g)); console.log('wrote', out, JSON.stringify(g).length, 'bytes');
