var roi_1 = /* color: #ffc82d */ee.Geometry.Polygon(
        [[[-71.73154235584835, -12.713809353876869],
          [-70.25388122303583, -13.382721620289002],
          [-68.97240728605269, -13.028183834962237],
          [-68.48508239491085, -12.499380174543054],
          [-68.9481960814841, -11.58258354320223],
          [-69.52878356678585, -10.82634165970472],
          [-70.6507348797875, -11.228754849491372],
          [-71.22617126209835, -11.747494750255138]]]);

var geometry = 
    /* color: #d63000 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-71.98126497022406, -10.844753693431327],
          [-71.98126497022406, -13.614606545656548],
          [-68.65240754834906, -13.614606545656548],
          [-68.65240754834906, -10.844753693431327]]], null, false);
var cluster_mdd_10_17 = ee.Image("users/glarrea/cluster_mdd"),
    // cluster_mdd_04_17 = ee.Image("users/glarrea/database_roads/rasters/clusters_8_2004_2017"),
    deforestation = ee.Image("UMD/hansen/global_forest_change_2017_v1_5"),
    pixlonlat = ee.Image("users/glarrea/pixlatlon"),
    nacroad = ee.FeatureCollection("users/glarrea/UntitledFolder/Firstroads2"),
    vecroad = ee.FeatureCollection("users/glarrea/UntitledFolder/third_roads_corrected"),
    deproad = ee.FeatureCollection("users/glarrea/UntitledFolder/SECONDROADS3");

//Precalculated database image
var database = ee.Image("users/glarrea/database_roads/rasters3/data_pre_100mpx"); 

var projection = deforestation.projection()

//merging all existing roads 
var allroad_existing = nacroad.merge(deproad).merge(vecroad).filterMetadata({
  name:'Estado',
  operator: 'equals',
  value: 0
}).filterBounds(roi_1)


var loss_01_10 = deforestation.select(["lossyear"]).lt(10).and(deforestation.select(["lossyear"]).gt(0)).not() //0: mask, 1: consider 
var land_cover_mask_10_17 = deforestation.select(["treecover2000"]).gte(50).and(loss_01_10)

///check 
var real_land_cover_change = deforestation.select(["lossyear"]).gte(10)
    //selects forest pixel with tree cover over 50% to mask non-forest pixels
    .updateMask(deforestation.select(["treecover2000"]).gte(50)).aside(Map.addLayer)

//selects deforested pixels from 2010    
var real_land_cover_change = deforestation.select(["lossyear"]).gte(10)
    //selects forest pixel with tree cover over 50% to mask non-forest pixels
    .updateMask(land_cover_mask_10_17).aside(Map.addLayer)

    
var buffer = allroad_existing.map(function(feature){return feature.buffer({
  distance: 20,  //change this parameter to select the buffer lenght
  maxError: ee.ErrorMargin(0.2, 'projected'),
  proj: projection.atScale(1000)
})}).union({maxError: 0.2})

var bands = [
  "distance_any",
  "distance_second",
  "distance_third",
  "distance_first",
  "distance_buffer",
  "distance_parks",
  "distance_villages",
  "altitude",
  "slope",
  "landform",
]
var database = ee.Image.cat(database.select(bands),real_land_cover_change,pixlonlat).aside(Map.addLayer) //pixlanlot has a latitude and longitude coordinates pre calculated to avoid exceeding memory



var training_deforested= database.stratifiedSample({
  numPoints: 500 , //does not matter
  classBand: 'lossyear',
  region: buffer,
  classValues:[0,1],
  classPoints:[15000,15000], 
  tileScale:8,
  scale: 100,
  projection:projection,
  geometries: true
  })

//Export the training set as GEE asset
Export.table.toAsset({
  collection: training_deforested,
  description:'training_set',
  assetId: 'training_set'
});

