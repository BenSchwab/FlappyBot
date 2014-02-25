var reward = 0.1;
var penalty = -100;
var discountFactor =  0.9; //good runs were at 0.9
var minThreshold = 0.0000005;
var previousDecision = null;
var currentDecision = null;
var mySarLog = new SARLog();

mySarLog.sarMap = nightModel;

var decisionsInChain = 0;


var pendingReset = false;
function onUpdate(){
   //console.log("Im being called");
   //dead bird
   //consflappyGame.flappyBird
  if(flappyGame.getFlappyBird().alive === false){
   scoreDecisionList(currentDecision, penalty, 10);
   currentDecision = null;
   //console.log(decisionsInChain);
   decisionsInChain = 0;
     //console.log("dead bird");
   //console.log("dead bird");
      flappyGame.requestFunction(function(){}, 1000);
      //apply penalty
     // console.log(currentDecision.sarLog.state.x +" "+ currentDecision.sarLog.state.y);
      //console.log(currentDecision.jump);

            //start a new game
            setTimeout(function(){
               //console.log("trying to restart");
               flappyGame.mouseClick(new Point(249, 380));
               flappyGame.requestFunction(onUpdate, 2);
            },2500);
            pendingReset = true;
  }
  else{
      decisionsInChain ++;

      var rect = flappyGame.getStateRectangle();
      //console.log(rect);
       var vector = rectToVector(rect);
       var mom = flappyGame.calculateMomentum();
       if(mom){
         //console.log("going down");
       }
       else{
         //console.log("going up");
       }
       scoreDecisionList(currentDecision, reward, 5);
      // console.log(vector.x + " " + vector.y);
       if(vector === null ){
         console.log("null vector");
         return;
       }
      var jump = makeDecision(vector);
      var record = mySarLog.getSARRecord(vector);
      //console.log(record);

      var n = new SARLL(record, currentDecision, jump);
      currentDecision = n;
      //console.log(jump);
        if(jump){
         record.jumpCount++;
         //console.log("I choose jump at " + vector.x +" "+ vector.y);
          flappyGame.simulateClick();
         //console.log("simulating click");
       }
       else{
         record.fallCount++;
       }

  }

}

function printSARLog(){
   //console.log(JSON.stringify(Object.keys(mySarLog.sarMap).length));
   //console.log(JSON.stringify(mySarLog.sarMap));
}
function printSARLogConsole(){
   console.log(JSON.stringify(Object.keys(mySarLog.sarMap).length));
   console.log(JSON.stringify(mySarLog.sarMap));
}
setInterval(printSARLog, 5000);


//console.log(flappyGame.getNextPipe());
flappyGame.startGame();
flappyGame.requestFunction(onUpdate, 15);


function makeRecordDecision(record){
  var jump = false;
  /*if(Math.random()>0.95){
      jump = true;
      //console.log("psuedo jump");
   } */
   if(record === null || record === undefined){
      return jump;
   }

   //console.log("makeDecision for "+ record.state.x +' ,' +record.state.y);
   //console.log("score of "+ record.totalFallReward +' ,' +record.totalJumpReward);
   //console.log(record.dropReward());
   //console.log(record.jumpReward());
   if(record.totalFallReward  === 0 && record.totalJumpReward!==0){
         jump = false;
      }
     else if(record.otalJumpReward === 0 && record.totalFallReward !==0){
         jump = true;
      }
      //explore
     // if(record.totalFallReward === 0 || record.totalJumpReward === 0){
     //     //jump = Math.random()>0.8;
     //  }

      else if(record.totalFallReward === record.totalJumpReward){
            //jump = Math.random()>0.95;
            jump = false;

      }
      else if(record.totalFallReward > record.totalJumpReward){
          jump = false;
      }
      else{
          jump = true;
      }

   return jump;
}

makeDecision = function(vector){
    //console.log("opportunity for decision!");
   var record = mySarLog.getSARRecord(vector);

   var jump = false;

   if(record !== null && record!== undefined){
       //console.log(record);
      //console.log("!!"+record.totalFallReward);
      jump = makeRecordDecision(record);

   }
   else{
      actionRecord = mySarLog.getNearestRecord(vector);
      //console.log("nearest: "+actionRecord);
      jump = makeRecordDecision(actionRecord);
      record = new SAR();
      record.state = vector;
      mySarLog.saveSARRecord(record);
      //console.log("creating new record");

   }

   return jump;
};

function scoreDecisionList(currentSAR, reward, max){
   if(max <= 0){
      return;
   }
    if(currentSAR === undefined || currentSAR === null){
      return;
   }
   if(Math.abs(reward) > minThreshold){
      if(currentSAR.jump){
         currentSAR.sarLog.totalJumpReward = (1-discountFactor)*currentSAR.sarLog.totalJumpReward + reward*discountFactor;
         //currentSAR.sarLog.jumpCount ++;
      }
      else{
         currentSAR.sarLog.totalFallReward = (1-discountFactor)*currentSAR.sarLog.totalFallReward + reward*discountFactor;
         //console.log(currentSAR.sarLog.totalFallReward);
      }
      reward = Math.max(currentSAR.sarLog.totalFallReward, currentSAR.sarLog.totalJumpReward);

      max--;
      scoreDecisionList(currentSAR.prevSar, reward, max);
   }
}

SARLL = function(sarLog, prevSar, choice){
   this.jump = choice;
   this.sarLog = sarLog;
   this.prevSar = prevSar;
};


var SAR = function(){
   this.state = null;
   this.totalJumpReward = 0;
   this.jR = 0;
   this.fR = 0;
   this.jumpCount = 0;
   this.fallCount = 0;
   this.totalFallReward = 0;

};



function SARLog(sarMap){
   this.sarMap = {};
   this.getSARRecord = function(vector){
      //console.log("lookin for: "+ vectorToString(vector));
      //console.log(this.sarMap);
      if(vector===null||vector===undefined){
         return null;
      }
      return this.sarMap[vectorToString(vector)];

   };
   this.saveSARRecord = function(sar){
      //var key = JSON.stringify(sar.state);
     // if(!(key in this.sarMap)){
      //console.log("creating"+ sar.stateToString() );
         this.sarMap[vectorToString(sar.state)] = sar;
      //}
   };
   this.getNearestRecord = function(vector){
      var bestRecord = null;
      var minDist = 100000000;
      for(var prop in this.sarMap){
         var p1 = this.sarMap[prop].state;
         var dist = distance(p1,vector);
         //console.log(dist);
         //console.log(p1);
         //console.log(dist);
         if(dist<minDist){
            minDist = dist;
            bestRecord = this.sarMap[prop];
         }

      }
      if(minDist<15){
         //console.log(minDist);
         return null;
         //return bestRecord;
      }
      else{
         return null;
      }


   };
}

function distance(p1,p2){
  // var wha = (p1.x-p2.x);
  // var hmm = (p1.x-p2.x)*(p1.x-p2.x);
   //console.log(wha +" " +hmm);
   return Math.sqrt((p1.x -p2.x)*(p1.x -p2.x) +(p1.y-p2.y)*(p1.y-p2.y));
}

function pointToDiscretePoint(p){
   return new Point(Math.floor(p.x), Math.floor(p.y));
}
function rectToVector(rect){
   if(rect === null || rect === undefined){
      return null;
   }
   var ul = rect.upperLeft;
   var lr = rect.lowerRight;
   ul = pointToDiscretePoint(ul);
   lr = pointToDiscretePoint(lr);
   var vector = new Point(lr.x -ul.x, lr.y-ul.y);
   return vector;

}

function vectorToString(vector){
   return vector.x+"_"+vector.y;
}



function Point(x,y){
  this.x = x;
  this.y = y;
}

