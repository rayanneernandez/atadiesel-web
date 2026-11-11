// Cena 3D da loja (maquete). Origem: ATADIESEL_Loja_3D_ThreeJS.html (Three.js r128).
// Diferença da maquete original: os produtos NÃO são mais modelados em 3D. Cada gôndola/prateleira mostra a FOTO real
// do móvel (ver mapa3dFotos.js). A cena é montada a partir das áreas da planta (opts.regions).
//
// buildScene(T, viewer, { regions, fotos, onPick, onView }) devolve { setHighlight, preset, setLayerVisible, dispose }.
/* eslint-disable */
export function buildScene(T, viewer, opts) {
 const REGIONS = opts.regions, FOTOS = opts.fotos || {};
 const positionMap = {}; REGIONS.forEach(r => r.keys.forEach(k => { positionMap[k] = r; }));
 const scale = 110, X = p => (p - 220) / scale - 5.2, Z = p => (p - 48) / scale - 4.03;
 const scene=new T.Scene();scene.background=new T.Color(0xc4ccd2);scene.fog=new T.Fog(0xc4ccd2,20,40);const camera=new T.PerspectiveCamera(49,1,.06,80);const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));renderer.outputEncoding=T.sRGBEncoding;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.domElement.className='webgl';viewer.append(renderer.domElement);renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none';
 const amb=new T.HemisphereLight(0xffffff,0x6e7783,1.13);scene.add(amb);const sun=new T.DirectionalLight(0xffe9d3,1.3);sun.position.set(-1,9,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=11;sun.shadow.camera.bottom=-11;sun.shadow.bias=-.001;scene.add(sun);
 const makeMat=(color,rough=.7,metal=0,extra={})=>new T.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});
 const M={floor:makeMat(0xc8c1b3,.84),wall:makeMat(0xdeddd5,.97),metal:makeMat(0xc7c5b4,.42,.25),shelf:makeMat(0xecece6,.34,.23),post:makeMat(0xd9d4c5,.4,.4),wood:makeMat(0xa86e43,.68),darkwood:makeMat(0x825033,.78),white:makeMat(0xf6f7f7,.6),black:makeMat(0x181c20,.4,.15),dark:makeMat(0x2c3742,.5),glass:makeMat(0x8ab5ca,.18,.16,{transparent:true,opacity:.2,depthWrite:false,side:T.DoubleSide}),blueglass:makeMat(0x9fd1eb,.12,.15,{transparent:true,opacity:.15,depthWrite:false,side:T.DoubleSide}),sil:makeMat(0x878e8f,.28,.55),orange:makeMat(0xf46920,.46),red:makeMat(0xc62b25,.6),green:makeMat(0x146032,.65),yellow:makeMat(0xfada1d,.63),navy:makeMat(0x1c3248,.5)};
 const groups={products:new T.Group(),labels:new T.Group(),walls:new T.Group(),fixtures:new T.Group(),highlights:new T.Group(),lights:new T.Group()};Object.values(groups).forEach(g=>scene.add(g));
 const geomCache=new Map();const materialCache=new Map();let seed=75321;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
 const box=(parent,w,h,d,x,y,z,mat,rotY=0,shadow=true)=>{const key=[w,h,d].map(n=>n.toFixed(3)).join('|');let geom=geomCache.get(key);if(!geom){geom=new T.BoxGeometry(w,h,d);geomCache.set(key,geom);}const a=new T.Mesh(geom,mat);a.position.set(x,y,z);a.rotation.y=rotY;a.castShadow=shadow;a.receiveShadow=shadow;parent.add(a);return a;};
 const cyl=(parent,r,h,x,y,z,mat,segments=10)=>{const geo=new T.CylinderGeometry(r,r,h,segments);const obj=new T.Mesh(geo,mat);obj.position.set(x,y,z);obj.castShadow=true;parent.add(obj);return obj;};
 function edgeBox(parent,w,h,d,x,y,z,material,edgeMat){box(parent,w,h,d,x,y,z,material);const e=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(w,h,d)),new T.LineBasicMaterial({color:edgeMat??0x85827c,transparent:true,opacity:.3}));e.position.set(x,y,z);parent.add(e)}
 function texCanvas(draw,w=256,h=256){const c=document.createElement('canvas');c.width=w;c.height=h;let ctx=c.getContext('2d');draw(ctx,w,h);let tx=new T.CanvasTexture(c);tx.encoding=T.sRGBEncoding;tx.anisotropy=4;return tx;}
 function textTexture(lines,bg='#10283b',color='#f5efc1',sub='#e8ca4b',w=512,h=256){return texCanvas((ctx,W,H)=>{ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.fillStyle=sub;ctx.fillRect(0,H*.76,W,H*.24);ctx.fillStyle=color;ctx.font='900 67px Arial';ctx.textAlign='center';const n=lines[0]||'';ctx.fillText(n.substring(0,14),W/2,H*.37);ctx.font='700 38px Arial';ctx.fillText((lines[1]||'').substring(0,17),W/2,H*.63);ctx.fillStyle='#222';ctx.font='700 25px Arial';ctx.fillText((lines[2]||'').substring(0,26),W/2,H*.9)},w,h)}
 const logoCache={};function labelFor(style){if(logoCache[style])return logoCache[style];let tx;
 if(style==='mann')tx=textTexture(['MANN','FILTER','FILTRO'], '#08603c','#fff025','#fff016');
 else if(style==='tecfil')tx=textTexture(['Tecfil','FILTROS','QUALIDADE'],'#163960','#ffe221','#f7bd22');
 else if(style==='parker')tx=textTexture(['Parker','RACOR','FILTER'],'#f5f3eb','#183b50','#eebf43');
 else if(style==='lubrax')tx=textTexture(['LUBRAX','ÓLEO MOTOR','20W-50'],'#12653a','#ecffef','#68b24d');
 else if(style==='panther')tx=textTexture(['Panther','HIDRA','20L'],'#172c45','#ffffff','#079bd8');
 else if(style==='castrol')tx=textTexture(['Castrol','MAGNATEC','5W-30'],'#1a6c47','#ffffff','#d32335');
 else if(style==='bardahl')tx=textTexture(['BARDAHL','ADITIVOS','B12'],'#174c30','#ffffff','#dfdb1d');
 else if(style==='cool')tx=textTexture(['RAD','COOL','LONG LIFE'],'#157744','#ffffff','#f5f3e9');
 else if(style==='bucket')tx=textTexture(['LUBRAX','GRAXA','20 KG'],'#e4e3e0','#316749','#58a35b');
 else if(style==='ice')tx=textTexture(['KIBON','SORVETES','FREEZER'],'#c42b34','#ffffff','#c42b34');
 else tx=textTexture(['FILTRO','AUTOPEÇAS','ATADIESEL'],'#263d58','#fff','#e6c34e');
 logoCache[style]=new T.MeshBasicMaterial({map:tx,side:T.DoubleSide,transparent:false});return logoCache[style]}
 function paperLabel(parent,style,x,y,z,w,h,orientation){const a=new T.Mesh(new T.PlaneGeometry(w,h),labelFor(style));a.position.set(x,y,z);if(orientation==='xplus')a.rotation.y=Math.PI/2;else if(orientation==='xminus')a.rotation.y=-Math.PI/2;else if(orientation==='zminus')a.rotation.y=Math.PI;parent.add(a);return a;}
 function sign(parent,txt,x,y,z,axis='zplus',bg='#14293b',fg='#ffffff',w=.45,h=.20){const tx=texCanvas((ctx,W,H)=>{ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.fillStyle=fg;ctx.font='bold 65px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,W/2,H/2)},300,115);const a=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,transparent:true,side:T.DoubleSide,depthTest:true}));a.position.set(x,y,z);a.rotation.y=axis==='xplus'?Math.PI/2:axis==='xminus'?-Math.PI/2:axis==='zminus'?Math.PI:0;groups.labels.add(a);return a;}

 // Fotos reais nos móveis: um plano com a foto (sem iluminação, cores fiéis), recortado para preencher sem distorcer.
 const photoMeshes = []; const texCache = new Map(); const texLoader = new T.TextureLoader(); const maxAniso = renderer.capabilities.getMaxAnisotropy();
 function photoPlane(parent, url, wp, hp, x, y, z, rotY) {
  const mat = new T.MeshBasicMaterial({ color: 0xd9d9d9, toneMapped: false });
  const mesh = new T.Mesh(new T.PlaneGeometry(wp, hp), mat); mesh.position.set(x, y, z); mesh.rotation.y = rotY; parent.add(mesh); photoMeshes.push(mesh);
  const apply = tex => {
   if (!tex) return;
   const ia = tex.image.width / tex.image.height, pa = wp / hp;
   tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
   if (ia > pa) { tex.repeat.set(pa / ia, 1); tex.offset.set((1 - pa / ia) / 2, 0); } else { tex.repeat.set(1, ia / pa); tex.offset.set(0, (1 - ia / pa) / 2); }
   mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true;
  };
  if (!texCache.has(url)) texCache.set(url, new Promise(res => texLoader.load(url, t => { t.encoding = T.sRGBEncoding; t.anisotropy = Math.min(8, maxAniso); res(t); }, undefined, () => res(null))));
  texCache.get(url).then(apply);
  return mesh;
 }
 // Piso: porcelanato bege 1m x 1m como nas referências.
 box(scene,10.8,.22,8.5,0,-.13,0,M.floor,false,false);
 const grout=makeMat(0xaca79c,.95);for(let x=-5.3;x<=5.3;x+=1){box(scene,.012,.007,8.3,x,.004,0,grout,0,false);}for(let z=-4.1;z<=4.1;z+=1){box(scene,10.5,.007,.012,0,.004,z,grout,0,false);}
 // Paredes com acabamento cinza quente e esquadrias grafite.
 box(groups.walls,10.55,3.05,.12,0,1.525,-4.05,M.wall);box(groups.walls,.13,3.04,8.12,-5.29,1.52,0,M.wall);box(groups.walls,.13,3.04,8.12,5.29,1.52,0,M.wall);
 box(groups.walls,4.45,2.9,.14,-3.07,1.45,4.09,M.wall);box(groups.walls,10.53,.17,.12,0,2.99,-4.03,M.wood);
 // Faixa e portas de vidro na fachada; frente quase transparente.
 box(groups.walls,.1,3.02,.19,-.75,1.52,4.07,M.dark);box(groups.walls,.1,3.02,.19,3.98,1.52,4.07,M.dark);box(groups.walls,4.84,.10,.10,1.57,2.90,4.08,M.dark);box(groups.walls,4.84,.10,.10,1.57,.12,4.08,M.dark);
 for(let i=0;i<2;i++){const xc=.43+i*2.32;box(groups.walls,.045,2.67,.06,xc,1.50,4.07,M.dark);box(groups.walls,2.30,2.66,.015,xc+1.16,1.52,4.075,M.glass,0,false);box(groups.walls,.06,.35,.06,xc+1.97,1.35,4.15,M.sil)}
 // Painéis de madeira junto às geladeiras e ao setor de café.
 box(groups.walls,.09,3.0,3.33,5.13,1.50,2.43,M.wood);box(groups.walls,1.68,3.0,.065,4.40,1.5,3.77,M.wood);
 // Spots de teto visíveis em perspectiva.
 for(let x=-4.2;x<4.8;x+=1.75){for(let z=-3;z<3;z+=2.15){cyl(groups.lights,.080,.035,x,2.955,z,M.white,16);cyl(groups.lights,.033,.036,x,2.926,z,new T.MeshBasicMaterial({color:0xfff7e3}),12)}}
 function fixtureTag(mesh,sector){mesh.userData.sector=sector;}
 function identifyTree(group,sector){group.traverse(o=>{if(o.isMesh&&!o.userData.noPick)o.userData.sector=sector;});}
 function groupCenter(reg){return {x:X(reg.x+reg.w/2),z:Z(reg.y+reg.h/2),w:reg.w/110,d:reg.h/110};}
 const regionGroups=new Map();const levelSegments={};
 const gondolaRegions=REGIONS.filter(r=>r.keys[0].startsWith('GONDULA'));
 function gondola(reg){const name=reg.keys[0],c=groupCenter(reg),horizontal=c.w>=c.d;const w=Math.max(.77,c.w*.965),d=Math.max(.82,c.d*.93);const group=new T.Group();group.position.set(c.x,0,c.z);groups.fixtures.add(group);regionGroups.set(name,group);const long=horizontal?w:d,deep=horizontal?d:w;
 box(group,w,.09,d,0,.09,0,M.shelf);if(horizontal){box(group,w,.06,.08,0,2.08,0,M.metal);for(const end of [-w/2+.045,w/2-.045])box(group,.06,1.91,deep, end,1.08,0,M.white);}else{box(group,.08,.06,d,0,2.08,0,M.metal);for(const end of [-d/2+.045,d/2-.045])box(group,deep,1.91,.06,0,1.08,end,M.white)}
 if(horizontal)box(group,w*.96,1.67,.045,0,1.04,0,M.white);else box(group,.045,1.67,d*.96,0,1.04,0,M.white);
 const heights=[.30,.82,1.35,1.86];heights.forEach((height,idx)=>{box(group,w,.045,d,0,height,0,M.shelf);const segment=box(group,horizontal?w*.89:w*.87,.065,horizontal?d*.89:d*.89,0,height-.04,0,M.white);segment.userData={sector:name,level:String(idx+1)};(levelSegments[name]??={})[String(idx+1)]=segment;});
 const foto=FOTOS[name];if(foto){for(const side of [-1,1]){const off=deep/2+.012;if(horizontal)photoPlane(group,foto,long*.97,1.96,0,1.07,side*off,side>0?0:Math.PI);else photoPlane(group,foto,long*.97,1.96,side*off,1.07,0,side>0?Math.PI/2:-Math.PI/2);}}
 const lbl=horizontal?{x:c.x,z:c.z+d/2+.11,axis:'zplus'}:{x:c.x+w/2+.12,z:c.z,axis:'xplus'};sign(groups.labels,name.replace('GONDULA','G'),lbl.x,2.18,lbl.z,lbl.axis,'#183e5f','#ffffff',.38,.20);identifyTree(group,name);
 }
 gondolaRegions.forEach(gondola);
 function wallShelves(reg){const name=reg.keys[0],c=groupCenter(reg),back=name.match(/\d+/)[0]>=4;if(back)c.z=-3.62;else c.x=-4.77;const g=new T.Group();g.position.set(c.x,0,c.z);groups.fixtures.add(g);regionGroups.set(name,g);const w=back?Math.max(.72,c.w*.96):.82,d=back?.82:Math.max(.86,c.d*.98);const atFace=back?'zplus':'xplus';
 // Base de madeira com dois nichos, como as fotos de bombonas e baldes.
 box(g,w,.13,d,0,.18,0,M.wood);box(g,w,.07,d,0,.52,0,M.wood);
 if(back){for(let i=0;i<3;i++){let xx=-w/2+i*w/2;box(g,.048,.52,d,xx,.27,0,M.wood)}}else{for(let i=0;i<3;i++){let zz=-d/2+i*d/2;box(g,w,.52,.048,0,.27,zz,M.wood)}}
 // Postes tubulares do chão ao teto, mais prateleiras de chapa perfurada.
 if(back){for(const x of [-w/2+.04,w/2-.04])for(const z of [-d/2+.05,d/2-.05])box(g,.045,2.88,.045,x,1.48,z,M.post);}else{for(const z of [-d/2+.04,d/2-.04])for(const x of [-w/2+.05,w/2-.05])box(g,.045,2.88,.045,x,1.48,z,M.post);}
 const levels=[.88,1.38,1.88,2.37,2.66];for(let j=0;j<levels.length;j++){const h=levels[j];box(g,w,.032,d,0,h,0,M.metal);if(back){for(let i=0;i<2;i++)box(g,w*.96,.009,.019,0,h+.022,-d/4+i*d/2,M.sil);}else{for(let i=0;i<2;i++)box(g,.017,.009,d*.97,-w/4+i*w/2,h+.021,0,M.sil);}let selectable=box(g,w*.98,.026,d*.96,0,h-.01,0,M.metal,0,false);selectable.userData={sector:name,level:String(j+1)};(levelSegments[name]??={})[String(j+1)]=selectable;
 }
 const fotoP=FOTOS[name];if(fotoP){if(back)photoPlane(g,fotoP,w*.98,2.78,0,1.46,d/2+.012,0);else photoPlane(g,fotoP,d*.98,2.78,w/2+.012,1.46,0,Math.PI/2);}
 const num=name.match(/\d+/)[0];if(back)sign(groups.labels,'P'+num+' / N'+num,c.x,2.90,c.z+.35,'zplus','#756044','#ffffff',.56,.17);else sign(groups.labels,'P'+num+' / N'+num,c.x+.40,2.88,c.z,'xplus','#756044','#ffffff',.56,.17);identifyTree(g,name);}
 REGIONS.filter(r=>r.keys[0].startsWith('PRATELEIRA')).forEach(wallShelves);
 // Expositores refrigerados 01-03, porta de vidro frontal e prateleiras internas iluminadas.
 function fridge(index,centerz){const g=new T.Group();g.position.set(4.77,0,centerz);groups.fixtures.add(g);const ww=.81,dd=1.30,hh=2.39;
 box(g,ww,.11,dd,0,.07,0,M.black);box(g,ww,.14,dd,0,hh-.06,0,M.black);for(const xx of [-ww/2+.035,ww/2-.035])for(const zz of [-dd/2+.04,dd/2-.04])box(g,.055,hh,.055,xx,hh/2,zz,M.black);
 box(g,.017,hh*.89,dd*.89,-ww/2+.04,hh/2,0,M.glass,0,false);box(g,.07,hh*.9,.046,-ww/2+.015,hh/2,0,M.black,0,false);
 box(g,.075,hh*.86,.05,-ww/2-.04,hh/2,0,M.sil);box(g,.04,hh*.88,dd*.92,ww/2-.05,hh/2,0,M.dark);
 for(let j=0;j<4;j++){let h=.48+j*.47;box(g,ww*.83,.025,dd*.9,0,h,0,M.sil);}
 sign(groups.labels,String(index).padStart(2,'0'),4.30,2.55,centerz,'xminus','#202d3b','#ffffff',.31,.16);identifyTree(g,'GELADEIRA '+index);}
 [-2.45,-1.0,.45].forEach((z,i)=>fridge(i+1,z));
 // Freezer horizontal Kibon no trecho de fachada e móveis de madeira de apoio.
 const furnz=3.30;
 box(groups.fixtures,2.20,.10,.78,-3.88,.20,furnz,M.wood);box(groups.fixtures,2.20,.75,.78,-3.88,.55,furnz,M.wood);for(let i=0;i<3;i++)box(groups.fixtures,.055,.68,.79,-4.85+i*.91,.55,furnz,M.darkwood);
 box(groups.fixtures,2.24,.91,.84,-1.66,.51,3.32,M.red);box(groups.fixtures,2.24,.085,.86,-1.66,1.01,3.32,M.white);box(groups.fixtures,2.18,.025,.76,-1.66,1.08,3.32,M.sil);paperLabel(groups.fixtures,'ice',-1.66,.57,3.751,1.62,.62,'zplus');
 // Estação de café / cantinho de apoio - madeira clara e cafeteira preta.
 const bar=new T.Group();bar.position.set(3.83,0,2.70);groups.fixtures.add(bar);box(bar,1.40,.08,.74,0,.91,0,M.wood);box(bar,1.40,.80,.70,0,.48,0,M.wood);for(let i of [-.38,.38])box(bar,.50,.03,.59,i,.48,.05,M.darkwood);
 box(bar,.54,.60,.50,-.25,1.23,-.06,M.black);box(bar,.54,.10,.53,-.25,1.56,-.06,M.sil);box(bar,.27,.27,.14,-.25,1.15,.235,M.sil);cyl(bar,.12,.13,-.25,1.01,.21,M.white,12);
 for(let i=0;i<3;i++){box(groups.walls,.90,.045,.27,4.16,1.44+i*.39,2.06,M.wood);}
 for(let i=0;i<2;i++){cyl(groups.lights,.32,.095,3.45+i*.62,2.43,2.22,M.white,28);cyl(groups.lights,.012,.47,3.45+i*.62,2.72,2.22,M.sil,8)}
 // Reflexo de vitrine na frente e acentos no piso.
 const roomTag=sign(groups.labels,'ATADIESEL',-.11,2.58,3.95,'zminus','#1d2b39','#ffffff',1.05,.25);
 // Foco de seleção.
 const glowingMat=new T.MeshBasicMaterial({color:0xf56942,transparent:true,opacity:.23,depthWrite:false,side:T.DoubleSide});const edgeMat=new T.LineBasicMaterial({color:0xff5427,linewidth:2,depthTest:false});let focusMesh=null,focusLine=null,pin=null,focusRegion=null;
 function clearFocus(){for(const m of [focusMesh,focusLine,pin])if(m){m.parent?.remove(m);if(m.geometry)m.geometry.dispose();}focusMesh=focusLine=pin=null;}
 function setHighlight(sector,level,pos){clearFocus();if(!sector)return;let reg=positionMap[sector]||positionMap[sector.replace('NICHO','PRATELEIRA')];if(!reg)return;focusRegion=reg;const center=groupCenter(reg);if(sector.startsWith('PRATELEIRA')||sector.startsWith('NICHO')){if(Number((sector.match(/\d+/)||['0'])[0])>=4)center.z=-3.62;else center.x=-4.77;}let width=reg.w/110,depth=reg.h/110;
 let y=level?(.35+((Math.max(1,Math.min(5,Number(level)))-1)*.51)):1.00;
 if(sector.startsWith('NICHO'))y=.36;
 if(sector.startsWith('PRATELEIRA'))y=level?([.88,1.38,1.88,2.37,2.66][Math.max(0,Math.min(4,Number(level)-1))]):1.4;
 let gx=center.x,gz=center.z,thick=.11;
 if(pos&&level){const toks=String(pos).match(/\d+/g);if(toks&&toks.length){const n=Math.min(12,Math.max(1,Number(toks[0]))),isX=reg.w>reg.h;if(isX){gx=center.x-width/2+width*(n-.5)/Math.max(8,Math.ceil(width/.18));width=Math.min(.3,width*.2)}else{gz=center.z-depth/2+depth*(n-.5)/Math.max(8,Math.ceil(depth/.18));depth=Math.min(.3,depth*.2);}}}
 const geo=new T.BoxGeometry(Math.max(width*.92,.14),thick,Math.max(depth*.90,.14));focusMesh=new T.Mesh(geo,glowingMat);focusMesh.position.set(gx,y,gz);focusLine=new T.LineSegments(new T.EdgesGeometry(geo),edgeMat);focusLine.position.copy(focusMesh.position);groups.highlights.add(focusMesh,focusLine);
 const bubble=new T.Mesh(new T.SphereGeometry(.10,12,9),new T.MeshBasicMaterial({color:0xff663b}));bubble.position.set(center.x,Math.max(2.5,y+.6),center.z);groups.highlights.add(bubble);pin=bubble;
 desired.target.set(center.x,.95,center.z);desired.radius=6.3;desired.phi=.78;desired.theta=center.x>1?-.46:.46;if(mode==='walk')mode='orbit';syncView('local');}
 // Camera orbital com botão de caminhada W A S D.
 let mode='orbit',walk={x:0,y:1.73,z:3.33,yaw:Math.PI,pitch:0};const actual={target:new T.Vector3(0,1.0,0),radius:14.6,theta:-.25,phi:1.00};const desired={target:new T.Vector3(0,1.0,0),radius:14.6,theta:-.25,phi:1.0};let dragging=false,moved=false,lastX=0,lastY=0,pointerStart={x:0,y:0},walkKeys={},currentPointer=-1;
 function syncView(view){opts.onView&&opts.onView(view);}
 function preset(view){if(view==='interno'){mode='walk';walk={x:.12,y:1.72,z:3.15,yaw:Math.PI,pitch:-.04};syncView(view);return;}mode='orbit';if(view==='geral'){desired.target.set(0,1,0);desired.radius=14.6;desired.theta=-.25;desired.phi=.99}else if(view==='superior'){desired.target.set(0,0,0);desired.radius=14.3;desired.theta=0;desired.phi=.025}else if(view==='entrada'){desired.target.set(0,1,-.7);desired.radius=8;desired.theta=.03;desired.phi=1.13}syncView(view)}
 const canvas=renderer.domElement;canvas.addEventListener('pointerdown',e=>{if(e.button===2)return;dragging=true;moved=false;currentPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;pointerStart={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;if(Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>5)moved=true;if(mode==='walk'){walk.yaw-=dx*.0035;walk.pitch=Math.max(-1.2,Math.min(1.2,walk.pitch-dy*.003));return;}if(e.shiftKey||e.buttons===2){const sc=desired.radius*.0018;desired.target.x-=dx*Math.cos(desired.theta)*sc;desired.target.z+=dx*Math.sin(desired.theta)*sc;desired.target.y+=dy*sc*.30;}else{desired.theta-=dx*.006;desired.phi=Math.max(.08,Math.min(1.50,desired.phi-dy*.006));}});
 canvas.addEventListener('pointerup',e=>{dragging=false;if(!moved){const r=canvas.getBoundingClientRect();const mouse=new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);const ray=new T.Raycaster();ray.setFromCamera(mouse,camera);const objects=[...groups.fixtures.children,...groups.walls.children];const hits=ray.intersectObjects(objects,true);for(const hit of hits){let node=hit.object;while(node&&!node.userData.sector)node=node.parent;if(node?.userData.sector){const sect=node.userData.sector;const reg=positionMap[sect];if(reg)opts.onPick&&opts.onPick(reg);break;}}}});canvas.addEventListener('pointercancel',()=>dragging=false);
 canvas.addEventListener('wheel',e=>{e.preventDefault();if(mode==='walk'){walk.x+=Math.sin(walk.yaw)*Math.sign(e.deltaY)*.18;walk.z+=Math.cos(walk.yaw)*Math.sign(e.deltaY)*.18;}else desired.radius=Math.max(3.1,Math.min(26,desired.radius*Math.exp(e.deltaY*.001)));},{passive:false});
 const onKeyDown=e=>{if(mode!=='walk'||document.activeElement.tagName==='INPUT')return;walkKeys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();};const onKeyUp=e=>{walkKeys[e.code]=false};window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);
 function setLayerVisible(kind,on){if(kind==='photos')photoMeshes.forEach(m=>{m.visible=on});else if(kind==='labels')groups.labels.visible=on;else if(kind==='walls')groups.walls.visible=on;}
 function size(){const r=viewer.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}window.addEventListener('resize',size);const ro=new ResizeObserver(size);ro.observe(viewer);size();
 const clock=new T.Clock();let frames=0;let raf=0,alive=true;function animate(){if(!alive)return;raf=requestAnimationFrame(animate);const dt=Math.min(.05,clock.getDelta());if(mode==='walk'){const speed=(walkKeys.ShiftLeft?4.1:2.1)*dt;const fx=Math.sin(walk.yaw),fz=Math.cos(walk.yaw);if(walkKeys.KeyW||walkKeys.ArrowUp){walk.x+=fx*speed;walk.z+=fz*speed}if(walkKeys.KeyS||walkKeys.ArrowDown){walk.x-=fx*speed;walk.z-=fz*speed}if(walkKeys.KeyA||walkKeys.ArrowLeft){walk.x+=fz*speed;walk.z-=fx*speed}if(walkKeys.KeyD||walkKeys.ArrowRight){walk.x-=fz*speed;walk.z+=fx*speed}walk.x=Math.max(-4.9,Math.min(4.9,walk.x));walk.z=Math.max(-3.7,Math.min(3.7,walk.z));camera.position.set(walk.x,walk.y,walk.z);camera.lookAt(walk.x+fx*Math.cos(walk.pitch),walk.y+Math.sin(walk.pitch),walk.z+fz*Math.cos(walk.pitch));}else{const k=1-Math.exp(-dt*6);actual.target.lerp(desired.target,k);actual.radius+=(desired.radius-actual.radius)*k;actual.phi+=(desired.phi-actual.phi)*k;actual.theta+=(desired.theta-actual.theta)*k;camera.position.set(actual.target.x+actual.radius*Math.sin(actual.phi)*Math.sin(actual.theta),actual.target.y+actual.radius*Math.cos(actual.phi),actual.target.z+actual.radius*Math.sin(actual.phi)*Math.cos(actual.theta));camera.lookAt(actual.target);}
 if(pin){const s=1+Math.sin(performance.now()*.004)*.25;pin.scale.setScalar(s);}renderer.render(scene,camera);frames++;}animate();
 function dispose(){alive=false;cancelAnimationFrame(raf);window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);window.removeEventListener('resize',size);ro.disconnect();texCache.forEach(p=>p.then(t=>{if(t)t.dispose();}));scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});renderer.dispose();if(renderer.domElement.parentNode)renderer.domElement.parentNode.removeChild(renderer.domElement);}
 return { setHighlight, preset, setLayerVisible, dispose };
}
