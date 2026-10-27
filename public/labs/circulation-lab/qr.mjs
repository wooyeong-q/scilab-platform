import {qrcodegen} from './vendor/qrcodegen.mjs';
export function qrMatrix(url){
  const parsed=new URL(url);
  if(!['http:','https:'].includes(parsed.protocol)||url.length>2000)throw Error('공유 주소를 확인해 주세요.');
  const qr=qrcodegen.QrCode.encodeText(url,qrcodegen.QrCode.Ecc.MEDIUM);
  return Array.from({length:qr.size},(_,y)=>Array.from({length:qr.size},(_,x)=>qr.getModule(x,y)));
}
export function qrSvg(url){
  const m=qrMatrix(url),size=m.length+8;
  const path=m.flatMap((row,y)=>row.flatMap((v,x)=>v?[`M${x+4},${y+4}h1v1h-1z`]:[])).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="친구가 만든 미로 열기" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
