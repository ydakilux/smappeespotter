import fs from 'fs';

async function testWMS() {
  const mfToken = 'eyJ4NXQiOiJOelU0WTJJME9XRXhZVGt6WkdJM1kySTFaakZqWVRJeE4yUTNNalEyTkRRM09HRmtZalkzTURkbE9UZ3paakUxTURRNFltSTVPR1kyTURjMVkyWTBNdyIsImtpZCI6Ik56VTRZMkkwT1dFeFlUa3paR0kzWTJJMVpqRmpZVEl4TjJRM01qUTJORFEzT0dGa1lqWTNNRGRsT1RnelpqRTFNRFE0WW1JNU9HWTJNRGMxWTJZME13X1JTMjU2IiwidHlwIjoiYXQrand0IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI2ZTBlNzYyYy1jN2JlLTRhNGQtODdmZS00N2QxZDMzODc3ZjUiLCJhdXQiOiJBUFBMSUNBVElPTiIsImF1ZCI6ImJxRTRvNXUxdFVwQ0F6ZzFTZWN3djFsTDVhc2EiLCJuYmYiOjE3ODQ0ODM4MjQsImF6cCI6ImJxRTRvNXUxdFVwQ0F6ZzFTZWN3djFsTDVhc2EiLCJzY29wZSI6ImRlZmF1bHQiLCJpc3MiOiJodHRwczpcL1wvcG9ydGFpbC1hcGkubWV0ZW9mcmFuY2UuZnJcL29hdXRoMlwvdG9rZW4iLCJleHAiOjE3ODQ0ODc0MjQsImlhdCI6MTc4NDQ4MzgyNCwianRpIjoiOTA0ZjhlNzYtNWZlOC00OTU1LWIwZmEtYjJiZTVhODVmODhjIiwiY2xpZW50X2lkIjoiYnFFNG81dTF0VXBDQXpnMVNlY3d2MWxMNWFzYSJ9.dsmQF8Sb9UmGyj8EJV0NXyKKl-bWlE71FYm559sMkBbR7Wru1P7PUCkpXl5HUtjcvTiRMdytO3sEazkQfSblJOiAoOR44t56d6sIoefyJQ2HMGBJJDyZjvekb9TL-aY5W67cd7nVo-RAt3FHGfQuwMvUpI-IqnT93Vz18GzzmLf5qWM_a2yDrgkJjKNvclvivZfmsiBg_k-SUqABcQyXbwBgOmC6U1hdQvMoyH1MK1Yzw0BLzbqLTar6PHEp9cNQ1vQgs6cvsea3so4n06HTOu1Zt0Q6Q3jiiUgoUuQ3Vr2CDe4iEN1ow2HIkg0jCQP6OVcix1rr9HN9OWoGSlmkNw';
  
  // Original BBOX requested by Leaflet
  const minX = -2.8125;
  const minY = 47.040182144806664;
  const maxX = 0;
  const maxY = 48.922499263758255;
  
  const widthDeg = maxX - minX;
  const heightDeg = maxY - minY;
  
  const reqWidth = 512;
  // Calculate best integer height
  const reqHeight = Math.round(reqWidth * (heightDeg / widthDeg));
  
  // Adjust BBOX to perfectly match reqWidth/reqHeight ratio
  const newHeightDeg = widthDeg * (reqHeight / reqWidth);
  const newMaxY = minY + newHeightDeg;
  
  const targetUrl = new URL('https://public-api.meteofrance.fr/public/arome/1.0/wms/MF-NWP-HIGHRES-AROME-001-FRANCE-WMS/GetMap');
  targetUrl.searchParams.set('service', 'WMS');
  targetUrl.searchParams.set('version', '1.3.0');
  targetUrl.searchParams.set('request', 'GetMap');
  targetUrl.searchParams.set('layers', 'TEMPERATURE__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND');
  targetUrl.searchParams.set('format', 'image/png');
  targetUrl.searchParams.set('transparent', 'true');
  targetUrl.searchParams.set('crs', 'EPSG:4326');
  targetUrl.searchParams.set('width', String(reqWidth));
  targetUrl.searchParams.set('height', String(reqHeight));
  targetUrl.searchParams.set('bbox', `${minY},${minX},${newMaxY},${maxX}`); // WMS 1.3.0 order
  
  console.log("Original BBOX aspect:", widthDeg / heightDeg);
  console.log("Image aspect:", reqWidth / reqHeight);
  console.log("New BBOX aspect:", widthDeg / newHeightDeg);
  console.log("URL:", targetUrl.toString());

  const res = await fetch(targetUrl.toString(), {
    headers: { 'Authorization': `Bearer ${mfToken}` }
  });
  
  const buffer = await res.arrayBuffer();
  fs.writeFileSync('test_tile_adjusted.png', Buffer.from(buffer));
  console.log(`Saved test_tile_adjusted.png (${buffer.byteLength} bytes)`);
}

testWMS().catch(console.error);
