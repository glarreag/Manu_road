//utils{
var palette = ['#9e0142','#d53e4f','#f46d43','#fdae61','#fee08b','#ffffbf','#e6f598','#abdda4','#66c2a5','#3288bd','#5e4fa2']
//var palette = ['#b2182b','#d6604d','#f4a582','#fddbc7','#f7f7f7','#d1e5f0','#92c5de','#4393c3','#2166ac']
var class_vis = {palette:palette.reverse(),
              max: 1, min:0
}
//}

var geometry = /* color: #d63000 */ee.Geometry.Polygon(
        [[[-71.22460258878856, -12.40725194312214],
          [-71.10100259757274, -12.50648622590006],
          [-70.86211663755503, -12.359927099281025],
          [-70.42687488961081, -12.65920602311415],
          [-70.30174112026965, -12.596293179404535],
          [-70.6382860613295, -12.317906259856851],
          [-70.84281041953572, -12.192251400127024],
          [-71.06527207283796, -12.324778312801442]]]);
var carbondensity = ee.Image("users/glarrea/UntitledFolder/CarbonDensity")
var ROADS = ee.FeatureCollection("users/glarrea/database_roads/ROADS") 
var deforestation = ee.Image("UMD/hansen/global_forest_change_2017_v1_5")
var loss_01_10 = deforestation.select(["lossyear"]).lt(10).and(deforestation.select(["lossyear"]).gt(0)).not() //0: mask, 1: consider 
var land_cover_mask_10_17 = deforestation.select(["treecover2000"]).gte(50).and(loss_01_10)

var predicted = ee.Image("users/glarrea/database_roads/rasters4/classified_rf_nolatlon_v6").updateMask(land_cover_mask_10_17)

var road = ROADS.filterMetadata("RODADURA", "equals", "Proyectado").filterMetadata("CLASE","equals","SECOND").filterBounds(geometry).geometry()


///////////////////////Repeat this lines for each road
//threshold 0.5
var distance = ee.List.sequence(100, 1000, 100).cat(ee.List.sequence(1000, 15000, 1000))

var distance = ee.List.sequence(1000, 20000, 1000)
print(distance)
var buffers = ee.FeatureCollection(distance.map(function(x){
              return ee.Feature(road.buffer(x))
              }))
// print(buffers.first())
var m3000 = road.buffer(15000).aside(Map.addLayer)

var th=predicted.gt(0.60).aside(Map.addLayer)
var predicted_th = th.multiply(carbondensity).aside(Map.addLayer)

var loss_meter = buffers.map(function(x){
        var geom = x.geometry();        
        var y = predicted_th.reduceRegion({
                  reducer:ee.Reducer.sum(),
                  geometry: geom,
                  scale:100,
                  tileScale:12
                }).get('classification')
        return ee.Feature(null, {carbon_loss:y})
});
Export.table.toDrive(loss_meter,'loss_per_meter_salvacion_bocamanu_v2','EE2',null,'CSV')
/////////////////////////////////////////////
var th_047=predicted.gt(0.47)
var loss04 = th_047.multiply(carbondensity).reduceRegion({
  reducer:ee.Reducer.sum(),
  geometry: m3000,
  scale:100,
  tileScale:4,
  crs: 'EPSG:32719'
})

var th_049=predicted.gt(0.49)
var loss05 = th_049.multiply(carbondensity).reduceRegion({
  reducer:ee.Reducer.sum(),
  geometry: m3000,
  scale:100,
  tileScale:4,
  crs: 'EPSG:32719'
})
var th_050=predicted.gt(0.50)
var loss06 = th_050.multiply(carbondensity).reduceRegion({
  reducer:ee.Reducer.sum(),
  geometry: m3000,
  scale:100,
  tileScale:4,
  crs: 'EPSG:32719'
})
var th_052=predicted.gt(0.52)
var loss07 = th_052.multiply(carbondensity).reduceRegion({
  reducer:ee.Reducer.sum(),
  geometry: m3000,
  scale:100,
  tileScale:4,
  crs: 'EPSG:32719'
})
var th_053=predicted.gt(0.53)
var loss07 = th_053.multiply(carbondensity).reduceRegion({
  reducer:ee.Reducer.sum(),
  geometry: m3000,
  scale:100,
  tileScale:4,
  crs: 'EPSG:32719'
})
var th_054=predicted.gt(0.54)
var loss08 = th_054.multiply(carbondensity).reduceRegion({
  reducer:ee.Reducer.sum(),
  geometry: m3000,
  scale:100,
  tileScale:4,
  crs: 'EPSG:32719'
})
var th_056=predicted.gt(0.56)
var loss09 = th_056.multiply(carbondensity).reduceRegion({
  reducer:ee.Reducer.sum(),
  geometry: m3000,
  scale:100,
  tileScale:4,
  crs: 'EPSG:32719'
})
var th_058=predicted.gt(0.58)
var loss10 = th_058.multiply(carbondensity).reduceRegion({
  reducer:ee.Reducer.sum(),
  geometry: m3000,
  scale:100,
  tileScale:4,
  crs: 'EPSG:32719'
})
var th_060=predicted.gt(0.60)
var loss11 = th_060.multiply(carbondensity).reduceRegion({
  reducer:ee.Reducer.sum(),
  geometry: m3000,
  scale:100,
  tileScale:4,
  crs: 'EPSG:32719'
})

print(loss07)
var carbonloss = ee.Array([loss04.get('classification'),loss05.get('classification'),loss06.get('classification'),
                          loss07.get('classification'),loss08.get('classification'),loss09.get('classification'),
                          loss10.get('classification'),loss11.get('classification')]).aside(print)
var th = ee.Array([0.47,0.49,0.50,0.52,0.54,0.56,0.58,0.6])
print(ui.Chart.array.values({
      array: carbonloss, 
      axis: 0, 
      xLabels: th
}).setOptions({
       title: 'Carbon loss - MD103 - MD101',
       legend: 'none',
       hAxis: { title: 'Threshold'},
     vAxis: { title: 'Mg of Carbon'},
       lineWidth: 1
 }));