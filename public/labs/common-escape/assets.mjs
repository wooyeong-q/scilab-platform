// The standalone review builder embeds these same files. No remote asset service.
export const IMAGE_FILES=Object.freeze(Object.fromEntries([
 'classroom','classroom-open','classroom-changed','library','library-changed',
 'broadcast','entrance','entrance-changed','corridor','courtyard','book','blood',
 'ghost-classroom','ghost-library','ghost-broadcast','ghost-hand','courtyard-haunted','archive-box'
].map(name=>[name,`assets/${name}-${["blood","ghost-classroom","ghost-library","ghost-broadcast"].includes(name)?"v2":"v1"}.webp`])));
export const artURL=name=>globalThis.window?.__commonEscapeAssets?.[name]||`./${IMAGE_FILES[name]}`;
const warmed=new Set();
export function warmArt(names){
 if(typeof globalThis.Image!=='function')return;
 for(const name of names){if(warmed.has(name)||!IMAGE_FILES[name])continue;warmed.add(name);const image=new Image();image.src=artURL(name);}
}
