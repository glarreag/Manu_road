//utils{
var palette = ['#9e0142','#d53e4f','#f46d43','#fdae61','#fee08b','#ffffbf','#e6f598','#abdda4','#66c2a5','#3288bd','#5e4fa2'];
var class_vis = {palette:palette.reverse(),
              max: 1, min:0
};
// }
var geometry = 
    /* color: #d63000 */
    /* shown: false */
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

// database with the variables used on training previously calculated from data_ingestion.js
var database = ee.Image("users/glarrea/roads_article/database") ;

// database that includes the projected roads previously calculated from data_ingestion.js
var database_to_predict = ee.Image("users/glarrea/roads_article/database_to_predict") ;

// training set previously stored as GEE asset from sampling.js
var training_set = ee.FeatureCollection("users/glarrea/roads_article/training_set");

//adding a column with random numbers
training_set = training_set.randomColumn({ seed: 1 });

//separating training and validation sets
var training = training_set.filter(ee.Filter.lt('random', 0.7));
var validation =training_set.filter(ee.Filter.gte('random', 0.7));



////Export csv files to drive folder to experiment with ANN using the same training and validation set {
// Export.table.toDrive({
//   collection:training,
//   description: "training",
//   folder: "your_folder",
//   fileFormat: "CSV" 
// })
// Export.table.toDrive({
//   collection:validation,
//   description: "validation",
//   folder: "your_folder",
//   fileFormat: "CSV" 
//}
//}

//add and remove bands (variables) for experimentation
var bands = [
  "altitude",
  // "cluster",
  // "latitude",
  "distance_second",
  "slope",
  "landform",
  "distance_parks",
  "distance_first",
  "distance_villages",
  "distance_buffer",
  "distance_third",
  "distance_any",
  // "longitude"
];

//train a classifier and revise the confusion matrix{
var classifier = ee.Classifier.smileRandomForest({
  numberOfTrees: 200, 
  bagFraction:0.8,
  maxNodes: null,
  seed:1}).train({
  features: training,
  classProperty: 'lossyear',
  inputProperties: bands
}).setOutputMode('CLASSIFICATION')  //Comment 
// }).setOutputMode('PROBABILITY')      //Uncomment for probability mode
;

var testAccuracy = validation
    .classify(classifier)
    .errorMatrix('lossyear', 'classification')
    .accuracy();
    
print('testAccuracy', testAccuracy);                 //only for classification
print('producerAccuracy', validation.classify(classifier).errorMatrix('lossyear', 'classification')
    .producersAccuracy());          
print('consumerAccuracy', validation.classify(classifier).errorMatrix('lossyear', 'classification')
    .consumersAccuracy());   
print('confusionMatrix',validation
    .classify(classifier)
    .errorMatrix('lossyear', 'classification'));

//}

//train a classifier and revise the ROC curve matrix{
var classifier = ee.Classifier.smileRandomForest({
  numberOfTrees: 200, 
  bagFraction:0.8,
  maxNodes: null,
  seed:1}).train({
  features: training,
  classProperty: 'lossyear',
  inputProperties: bands
// }).setOutputMode('CLASSIFICATION')  //Comment 
}).setOutputMode('PROBABILITY')      //Uncomment for probability mode
;  

var validation_classified_csv = validation.classify(classifier);

// ROC Curve 
var ROC_field = 'classification', ROC_min = 0, ROC_max = 1, ROC_steps = 50, ROC_points = validation_classified_csv;

var ROC = ee.FeatureCollection(ee.List.sequence(ROC_min, ROC_max, null, ROC_steps).map(function (cutoff) {
  var target_roc = ROC_points.filterMetadata('lossyear','equals',1);
  // true-positive-rate, sensitivity  
  var TPR = ee.Number(target_roc.filterMetadata(ROC_field,'greater_than',cutoff).size()).divide(target_roc.size()) ;
  var non_target_roc = ROC_points.filterMetadata('lossyear','equals',0);
  // true-negative-rate, specificity  
  var TNR = ee.Number(non_target_roc.filterMetadata(ROC_field,'less_than',cutoff).size()).divide(non_target_roc.size()) ;
  return ee.Feature(null,{cutoff: cutoff, TPR: TPR, TNR: TNR, FPR:TNR.subtract(1).multiply(-1),  dist:TPR.subtract(1).pow(2).add(TNR.subtract(1).pow(2)).sqrt()});
}));
// Use trapezoidal approximation for area under curve (AUC)
var X = ee.Array(ROC.aggregate_array('FPR')), 
    Y = ee.Array(ROC.aggregate_array('TPR')), 
    Xk_m_Xkm1 = X.slice(0,1).subtract(X.slice(0,0,-1)),
    Yk_p_Ykm1 = Y.slice(0,1).add(Y.slice(0,0,-1)),
    AUC = Xk_m_Xkm1.multiply(Yk_p_Ykm1).multiply(0.5).reduce('sum',[0]).abs().toList().get(0);
print(AUC,'Area under curve');
// Plot the ROC curve
print(ui.Chart.feature.byFeature(ROC, 'FPR', 'TPR').setOptions({
      title: 'ROC curve',
      legend: 'none',
      hAxis: { title: 'False-positive-rate'},
      vAxis: { title: 'True-positive-rate'},
      lineWidth: 1}));

// find the cutoff value whose ROC point is closest to (0,1) (= "perfect classification")      
var ROC_best = ROC.sort('dist').first().get('cutoff').aside(print,'best ROC point cutoff');

//}

////Feature importance{
var dict = classifier.explain();
print('Explain:',dict);
 
var variable_importance = ee.Feature(null, ee.Dictionary(dict).get('importance'));

var chart=
ui.Chart.feature.byProperty(variable_importance)
.setChartType('ColumnChart')
.setOptions({
title: 'Random Forest Variable Importance',
legend: {position: 'none'},
hAxis: {title: 'Bands'},
vAxis: {title: 'Importance'}
});
print(chart);
//}

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////// Visualization ///////////////////////////////////
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

var classified = database.select(bands).classify(classifier);
// var classified = database_to_predict.select(bands).classify(classifier); //uncomment to predict the database with projected roads
Map.addLayer(classified, class_vis, "projected_roads");

Export.image.toAsset({
  image:classified, 
  description:"predicted_image",
  assetId:"predicted_image", 
  region:geometry, 
  scale:100, 
  maxPixels:1e12});

Export.image.toDrive({
  image:classified, 
  description:"predicted_image", 
  folder:"my_drive_folder", 
  fileNamePrefix:"predicted_image", 
  region:geometry, 
  scale:100, 
  crs:'EPSG:32719', 
  maxPixels:1e13
  }
  );
  






