function sarSorter(sarOne, sarTwo){
   if(sarOne.state.x==sarTwo.state.x){
      return sarOne.state.y - sarTwo.state.y;
   }
   return sarOne.state.x - sarTwo.state.x;
}


function sarMapToArray(sarMap){
   var arr = [];
   for(var prop in sarMap ){
      arr.push(sarMap[prop]);
   }
   arr.sort(sarSorter);
   return arr;
}

function sortSarArray(sarArray){
   return sarArray.sort(sarSorter);
}

function combineModels(modelOne, modelTwo){
   for(var p1 in modelOne){
      if(!modelTwo.hasOwnProperty(p1)){
         modelTwo[p1] = modelOne[p1];
      }
   }
   return modelTwo;
}