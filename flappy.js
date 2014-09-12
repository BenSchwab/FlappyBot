
var flappyGame = (function(){

  //-------------Canvas and Scene Variables-----------------//
  var canvas = document.getElementById("game_screen");
  var ctx = canvas.getContext("2d");
  var screen_height = canvas.height;
  var screen_width = canvas.width;
  var overflowCheck = 9007199254740900;
  var flappyKirill = false;
  var snow = true;

  //----------- Audio bank-------------------------------//
  var coinAudio = new Audio('assets/audio/coin.wav');
  var flapAudio = new Audio('assets/audio/flap.wav');
  var deadAudio = new Audio('assets/audio/dead.wav');

function playAudio(audio){
   if (audio.paused) {
        audio.play();
    }else{
        audio.currentTime = 0;
    }
}


  //-------------Image Bank---------------------------------//
  var imageBank = (function prepareImages(){
    var images = ["background.png", "ground.png",
    "bird_one.png", "bird_two.png", "bird_three.png","bird_dead.png",
    "pipe_up.png", "pipe_down.png", "scoreboard.png", "bird_down.png",
    "play.png", "kirill_one.png","kirill_two.png","kirill_three.png",
    "kirill_dead.png", "duke_background.png", "snow_ground.png", "finger.png", "finger_touch.png"];
    var imageBank = {};
    var doneCount= 0;

    images.forEach(function(im){
     var image = new Image();
     image.onload = function(){
      doneCount ++;
    };
    image.src = "assets/images/"+im;
    imageBank[im.split(".")[0]] = image;
  });
    return imageBank;
  })();


  //------------------------Object Definitions---------------------------------//


   function Camera(){
    apply_mixin.call(this, Scrollable);
    this.x = 0;
    this.y = 0;
    this.width = screen_width;
    this.height = screen_height;
    this.translatePoint = function(x,y){
     return ({"x": x - this.x,"y": y - this.y});
   };
   this.translatePointInverse = function(x,y){
     return ({"x": x + this.x,"y": y + this.y});
   };
 }

 var apply_mixin = function() {
  return Array.prototype.reduce.call(arguments, function(self, mixin) {
   mixin.call(self);
   return self;
 }, this);
};

Finger = function(){
  apply_mixin.call(this, Entity);
  this.width = 90;
  this.height = 200;
  this.x = 30;
  this.y = screen_height-this.height;
  this.standardDraw = this.draw;
  this.stationary = true;
  this.touchTime = 5;
  this.currentTouchTime = 0;

  this.standarSpriteSheet =new SpriteSheet([imageBank["finger"]],[1]);
  this.clickSpriteSheet = new SpriteSheet([imageBank["finger_touch"]],[100]);
  this.spriteSheet =  this.standarSpriteSheet;
  this.draw = function(ctx, camera){
    this.standardDraw(ctx, camera);
    this.currentTouchTime --;
  };
  this.getSpriteSheet = function(){
    if(this.currentTouchTime>0){
      return this.clickSpriteSheet;
    }
    else{
      return this.standarSpriteSheet;
    }
  };
  this.touch = function(){
    this.currentTouchTime = this.touchTime;
  };

};


SpriteSheet = function(images, durations){
  this.images = images;
  this.durations = durations;
  this.durationMap = durations.reduce(
   function(prev, current, index, array){
     if(index>=1){
      prev.push(prev[index-1]+current);
    }
    else{
      prev.push(current);
    }
    return prev;

  }, []
  );
  this.totalDuration = this.durationMap[this.durationMap.length-1];
  this.frame = 0;
  this.getNextSpriteImage = function(){
   this.frame = (this.frame+1)%this.totalDuration;
   var index = 0;
   while(this.frame>this.durationMap[index]){
    index++;
  }
  return this.images[index];
};
};

Entity = function() {
  this.x  = 0;
  this.y = 0;
  this.width = 0;
  this.height = 0;
  this.stationary = false;
  this.color = "#000000";
  this.spriteSheet = null;
  this.zIndex = 0;
  this.skew = 0;
  this.dirty = false;
  this.getBoundingBox = function(){
   var refX =this.x;
   var refY=this.y;
   if(this.stationary){
    var refPoint = camera.translatePointInverse(this.x, this.y);
    refX = refPoint.x;
    refY = refPoint.y;
  }
  return new Rectangle(new Point(refX,refY), new Point(refX+this.width, refY+this.height));
  };
  this.update  = function(){
   this.updateFunctions.forEach(function(updateFunction){
    updateFunction();
  });
  };
  this.getCameraPoint = function(){
    return camera.translatePoint(this.x, this.y);
  };
  this.containsPoint = function(point){
    return this.getBoundingBox().containsPoint(point);
  };

  this.draw = function(ctx, camera){
    var drawX = this.x;
    var drawY = this.y;
    if(!this.stationary){
     var point = this.getCameraPoint();
     drawX = point.x;
     drawY = point.y;
   }
   ctx.save();
   if(this.skew){
    var center = new Point(drawX+this.width/2, drawY+this.height/2);
    ctx.translate(center.x,center.y);
    ctx.rotate(this.skew*Math.PI/180);
    ctx.translate(-center.x,-center.y);
  }

  if(this.getSpriteSheet()===null){
    ctx.fillStyle = this.color;
    ctx.fillRect(drawX, drawY, this.width, this.height);
  }
  else{
   var image = this.getSpriteSheet().getNextSpriteImage();
   ctx.drawImage(image, drawX,drawY,this.width,this.height);
  }
  ctx.restore();
  };
  this.setSpriteSheet = function(spriteSheet){
   this.spriteSheet = spriteSheet;
  };
  this.getSpriteSheet = function(){
   return this.spriteSheet;
  };
  return this;
  };
  function Jumper(){
   this.jump = function(){
    if(this.alive){
     jumpForces.forEach(function(jf){ jf.dirty = true;});
     var jf = new JumpForce(this);
     jumpForces.push(jf);
     activeForces.push(jf);
     gravityForce.resetGravity();
   }
   playAudio(flapAudio);
  };
  return this;
}
function CollidableEntity(){
 this.onCollision = null;
 this.checkCollision = function(entityOther, lOnCollision, lOnCollisionArgs)
 {
  if(this.getBoundingBox().intersect(entityOther.getBoundingBox())){
    if(lOnCollision!==undefined){
     lOnCollisionArg.apply(this, lOnCollisionArgs);
   }
   else if(this.onCollision!==null){
     this.onCollision.apply(this, this.collisionArguments);
   }
   return true;
 }
 return false;
};
return this;
}

function FlappyBird(){
 apply_mixin.call(this, Entity, Jumper);
 this.color = 'gray';
 this.height = 40;
 this.width = 40;
 this.x= 230;
 this.y= 200;
 this.zIndex = 2;
 this.alive = true;
 if(flappyKirill){
  this.aliveSpriteSheet =  new SpriteSheet([imageBank.kirill_one, imageBank.kirill_two, imageBank.kirill_three], [10,10,10]);
  this.deadSpriteSheet = new SpriteSheet([imageBank.kirill_dead],[25]);
}
else{
  this.aliveSpriteSheet =  new SpriteSheet([imageBank.bird_one, imageBank.bird_two, imageBank.bird_three], [10,10,10]);
  this.deadSpriteSheet = new SpriteSheet([imageBank.bird_dead, imageBank.bird_down],[25, 999999999999]);
}
this.getSpriteSheet = function(){
  if(this.alive){
   return this.aliveSpriteSheet;
 }
 else{
   return this.deadSpriteSheet;
 }
};
return this;
}

function Pipe(isBottomPipe) {
 apply_mixin.call(this, Entity, CollidableEntity);
 this.zIndex = 1;
 this.color = 'black';
 this.height = 50;
 this.width = 100;
 this.x = 500;
 this.y = 100;
 this.bottom = 100;
 this.isBottomPipe = isBottomPipe ? isBottomPipe : false;
 this.bottomSpriteSheet = new SpriteSheet([imageBank.pipe_up],[10]);
 this.topSpriteSheet = new SpriteSheet([imageBank.pipe_down],[10]);
 this.standardBoundingBox = this.getBoundingBox;
 this.getBoundingBox = function(){
  if(this.isBottomPipe){
    return this.standardBoundingBox();
  }
  else{
     var refX =this.x;
    var refY=this.y;
    if(this.stationary){
      var refPoint = camera.translatePointInverse(this.x, this.y);
      refX = refPoint.x;
      refY = refPoint.y;
    }
    startY = (-overflowCheck);
    return new Rectangle(new Point(refX,startY), new Point(refX+this.width, refY+this.height));
  }
 };
 this.getSpriteSheet =  function(){
  if(this.isBottomPipe){
   return this.bottomSpriteSheet;
 }
 else{
   return this.topSpriteSheet;
 }
};
this.completed = false;
this.onCollision = function(){
  flappyBird.alive = false;
  momentum.dirty = true;
  playAudio(deadAudio);
};
return this;
}

function Ground(){
 apply_mixin.call(this, Entity, CollidableEntity);


this.color = "green";
this.width = screen_width;
this.height = 100;
this.x = 0;
this.y = screen_height-100;
this.zIndex = 3;
this.stationary = true;
this.spriteSheet = new SpriteSheet([imageBank.snow_ground],[10]);
this.onCollision = function(){
  if(flappyBird.alive){
    playAudio(deadAudio);
  }
  flappyBird.alive=false;
  momentum.dirty = true;
  gravityForce.dirty=true;
  scoreBoard.visible = true;
  playButton.visible = true;

};
}

function Sky(){
 apply_mixin.call(this, Entity);
 this.color = "blue";
 this.width = screen_width;
 this.height = screen_height -100;
 this.x = 0;
 this.y = 0;
 this.zIndex = 0;
 this.stationary = true;
 this.spriteSheet = new SpriteSheet([imageBank.duke_background],[10]);
}

function ScoreBoard(){
 apply_mixin.call(this,Entity);
 this.score = 0;
 this.bestScore = 0;
 this.visible = false;
 this.x = 140;
 this.y = 220;
 this.width = 200;
 this.height = 130;
 this.stationary = true;
 this.zIndex = 3;
 this.spriteSheet = new SpriteSheet([imageBank.scoreboard], [5]);

 this.getSpriteSheet = function(){
   return this.spriteSheet;
 };
 this.oldDraw = this.draw;
 this.draw = function(ctx, camera){
  if(!this.visible){
   return;
 }
 this.oldDraw(ctx, camera);
 ctx.font = "24px flappy_font";
 ctx.fillStyle = "black";
 ctx.fillText(this.score+"",this.x+160,this.y+60);
 ctx.fillText(this.bestScore+"",this.x+160,this.y+110);
};
this.scorePipes = function(pipes){
  var didScore = false;
  for(var i =0; i<pipes.length; i++){
   if(pipes[i].x+pipes[i].width<flappyBird.x&&pipes[i].completed === false){
     pipes[i].completed = true;
     didScore = true;
   }
 }
 if(didScore){
  this.score ++;
  this.bestScore = Math.max(this.bestScore, this.score);
  scoreMessage.message = this.score+"";
  playAudio(coinAudio);
}
};
}

function TextMessage(message, position, duration, fill){
 this.message = message;
 this.position = position;
 this.duration = duration;
 this.dirty = false;
 this.frames = 0;
 this.fill = fill;
 this.draw = function(ctx){
  this.frames++;
  if(this.frames>this.duration&&this.duration!=="infinte"){
   this.dirty = true;
   return;
 }
 if(this.fill!==undefined){
  ctx.fillStyle = this.fill;
 }
 else{
   ctx.fillStyle = "white";
  }
 ctx.font = "50px flappy_font";
 ctx.fillText(this.message,this.position.x,this.position.y);
 ctx.fillStyle = "black";
 ctx.lineWidth = 2;
 ctx.strokeText(this.message,this.position.x,this.position.y);
};
return this;
}

function Force(){
 this.numberOfFrames = 0;
 this.currentFrame =  0;
 this.forceFunction = null;
 this.dirty = false;
 this.target = null;
 this.exertForce = function(){
  this.currentFrame++;
  if(this.numberOfFrames<this.currentFrame && this.duration !=="infinite"){
    this.dirty = true;
    return;
  }
  if(Array.isArray(this.target)){
    target.forEach(function(tar){this.forceFunction(tar);});
  }
  else{
   this.forceFunction(this.target);
 }
};
}
function GravityForce(target){
 apply_mixin.call(this,Force);
 this.numberOfFrames = "infinite";
 this.target = target;
 this.gravityForce = 4.5;
 this.resetGravity = function(){
  this.gravityForce = 4.5;
 };
 this.forceFunction = function (entity){
  this.gravityForce+=0.15;
  entity.y +=  this.gravityForce;
  entity.skew +=5;
  entity.skew = Math.min(90,entity.skew);
};
}
function MomentumForce(target){
  apply_mixin.call(this,Force);
  this.numberOfFrames = "infinite";
  this.target = target;
  this.forceFunction =  function scrollFunc(target){
    if(!this.dirty){
      //console.log("applying momentum");
      var scrollSpeed = 2.5;
      target.x += scrollSpeed;
    }
  };
}
function JumpForce(target){
 apply_mixin.call(this,Force);
 this.numberOfFrames = 10;
 this.target = target;
  this.strength = 12;
  this.baseStrength = 12;
 this.forceFunction = function jumpForce(entity){
  gravityForce.resetGravity();
  this.strength = this.baseStrength - this.currentFrame/5;
  entity.y -=  this.strength;
  entity.skew = -30;
};
}
var jumpEventNotifier = (function(){
  subscribers = [];
  return {
   subscribe: function(jumpSubscriber){subscribers.push(jumpSubscriber);},
   notifyJumpEvent: function(){
    subscribers.forEach( function(subscriber){
     subscriber.jump();
   });
  }
};
})();

function Rectangle(upperLeft, lowerRight){
 this.upperLeft = upperLeft;
 this.lowerRight = lowerRight;
 this.top = upperLeft.y;
 this.bottom = lowerRight.y;
 this.right = lowerRight.x;
 this.left = upperLeft.x;
 this.intersect = function(r2){
  return !(r2.left > this.right ||
    r2.right < this.left ||
    r2.top > this.bottom ||
    r2.bottom < this.top);
};
this.containsPoint = function(p){
 return !(p.x> this.right ||
  p.x < this.left ||
  p.y > this.bottom ||
  p.y < this.top);
};
}

function Point(x,y){
  this.x = x;
  this.y = y;
}


function Scrollable(){
 this.scrollForce = new MomentumForce(this);
 this.onUpdate = function(){
  this.scrollForce.exertForce();
};
}

function PlayButton (){
 apply_mixin.call(this, Entity);
 this.spriteSheet = new SpriteSheet([imageBank.play], [5]);
 this.visible = false;
 this.onClick = function(e){
  var clickLoc = e;
  e = camera.translatePointInverse(e.x, e.y);
  //console.log(e.x, e.y);
  if(this.containsPoint(e)&&this.visible){
      //console.log(clickLoc);

      //console.log(this.visible);
         //console.log("You got me!");
         restartGame();
       }
     };
  this.stationary = true;
  this.width = 100;
  this.height = 50;
  this.x =180;
  this.y = 360;

   }
   function restartGame(){
    //console.log("restarting game");
    scoreBoard.score = 0;
    createInitialGameObjects();
    scoreBoard.visible = false;
    playButton.visible = false;

    gameOn = true;
  }










   //-------------------------Game State ---------------------------//


   var gameText;
   var activeForces;
   var jumpForces;
   var pipes;
   var ground;
   var sky;
   var scoreBoard = new ScoreBoard();
   var camera;
   var entities;
   var gravityForce;
   var momentum;
   var playButton;
   var flappyBird;
   var scoreMessage;


   function createInitialGameObjects(){
    camera = new Camera();
    gameText = [];
    activeForces = [];
    jumpForces = [];
    pipes = [];
     entities = [];
    sky = new Sky();
    ground = new Ground();
    flappyBird = new FlappyBird();
    jumpEventNotifier.subscribe(flappyBird);
    gravityForce = new GravityForce(flappyBird);
    momentum = new MomentumForce(flappyBird);
    activeForces.push(gravityForce);
    activeForces.push(momentum);
    playButton = new PlayButton();
    scoreMessage = new TextMessage(""+scoreBoard.score, new Point(screen_width/2, screen_height/8), "infinite");
    registerEntity(flappyBird);
    registerEntity(sky);
    registerEntity(ground);
    registerEntity(scoreBoard);
    makePipeGenerator();
    gameText.push( new TextMessage("Get Ready!", new Point(screen_width/2-100, screen_height/2), 80, "orange") );
    //flappyGame.flappyBird = flappyBird;






  }
  createInitialGameObjects();
  var pipeGenerator;

  function makePipeGenerator(){

     pipeGenerator = (function (){
      var currentFrame = 149;
      var pipeFrequency = 150;
      var spaceSize = 150;
      var totalRoom = screen_height - ground.height;
      var min = 75;
      return function(){
       currentFrame++;
       if(currentFrame%pipeFrequency === 0){
         var pipeOne = new Pipe(false);
         var pipeTwo = new Pipe(true);
         pipeOne.x += camera.x + 50;
         pipeTwo.x +=camera.x + 50;
         pipeOne.y = 0;
         //var pipeHeight = Math.floor((totalRoom - spaceSize)*Math.random());
         var rand = (Math.floor(Math.random()*9)+1)/10;
         var pipeHeight = min + Math.floor((totalRoom- spaceSize - min)*rand);
         pipeOne.height = pipeHeight;
         pipeTwo.height = totalRoom-spaceSize-pipeHeight;
         pipeTwo.y = totalRoom-pipeTwo.height;

         pipes.push(pipeOne);
         pipes.push(pipeTwo);

         registerEntity(pipeOne);
         registerEntity(pipeTwo);
       }
     };

   })();
}
makePipeGenerator();

 var spriteCleaner = (function(){
  var currentFrame = 0;
  var cleanFrequency = 1000;
  return function(){
    function cleanSprite(currentSprite){
     var p = camera.translatePoint(currentSprite.x, currentSprite.y);
     p.x += currentSprite.width;
        return (p.x>0||currentSprite.stationary); //osmething wrong!
      }
      currentFrame++;
      if(currentFrame%cleanFrequency===0){
        entities = entities.filter(cleanSprite);
        pipes = pipes.filter(cleanSprite);
      }
    };

  })();

  function dirtyFilter(objectList){
   objectList =  objectList.filter(function(object){
     return object.dirty===undefined || !object.dirty;
   });
   return objectList;
 }

 function cleanDirtyElements(entity){
   return this.dirty;
 }

 function sortEntitiesForDrawing(entityOne, entityTwo){
   return entityOne.zIndex - entityTwo.zIndex;
 }

 function registerEntity(entity){
   entities.push(entity);
   entities.sort(sortEntitiesForDrawing);
 }

 function getNextPipe(){
   for(var i =0; i<pipes.length; i++){
    if(pipes[i].x+pipes[i].width>flappyBird.x&&pipes[i].isBottomPipe){
     return pipes[i];
   }
 }
}

   //------------------------------------GameLoop------------------------------------//

   var gameOn = false;
   var animFrame;
   function startGame(){
    //gameOn = true;
    animFrame = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    window.oRequestAnimationFrame      ||
    window.msRequestAnimationFrame     ||
    null ;
    animFrame(recursiveAnim);
      // flappyGame.flappyBird = flappyBird;
  }
  var recursiveAnim = function() {
    if(gameOn){
      mainloop();
    }
    animFrame( recursiveAnim );
  };

  var currentFrame = 0;
  var mainloop = function() {

    if(gameOn){
     currentFrame ++;
     updateGame();
    }

   drawGame();
   if(callback&&(currentFrame%callbackFreq === 0)){
      callback();
   }

 };

//---------------------------Draw Loop----------------------------//

snow = new SnowEffect();
finger = new Finger();
showFinger = true;
function drawGame(){

 entities.forEach(function(entity){
  entity.draw(ctx,camera);
});
 gameText.forEach(function(text){
  text.draw(ctx);
});
 scoreMessage.draw(ctx);
if(snow){
   snow.draw();
}
if(showFinger&&flappyGame.disableInput){
  finger.draw(ctx, camera);
}
 if(flappyBird.alive===false){
  scoreBoard.draw(ctx,camera);
  if(playButton.visible){
   playButton.draw(ctx, camera);
 }

}

}

//-------------------------Update Loop-------------------------//

function updateGame(){
 if(flappyBird.alive){
  //console.log("alive and well");
  camera.onUpdate();
  pipeGenerator();
  spriteCleaner();
  scoreBoard.scorePipes(pipes);
  pipes.forEach(function(pipe){
   pipe.checkCollision(flappyBird);
 });
}
ground.checkCollision(flappyBird);
activeForces.forEach(function(force){
  force.exertForce();
});
activeForces = dirtyFilter(activeForces);
//console.log(activeForces.length);
}



//--------------------------Event Listeners---------------------------//

canvas.addEventListener("click", canvasClick, false);

document.onkeypress = function(evt) {
  if(flappyGame.disableInput){
    return;
  }
 evt = evt || window.event;
 if (evt.keyCode === 32) {
  jumpEventNotifier.notifyJumpEvent();
}
};

function canvasClick(e){
   if(flappyGame.disableInput){
      return;
   }
  if(!gameOn){
    startGame();
  }
  jumpEventNotifier.notifyJumpEvent();
  var x;
  var y;
  if (e.pageX || e.pageY) {
   x = e.pageX;
   y = e.pageY;
 }
 else {
   x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
   y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
 }
 x -= canvas.offsetLeft;
 y -= canvas.offsetTop;
 var canvasPoint = new Point(x,y);
 //console.log(canvasPoint);
 //console.log(playButton.visible);
 playButton.onClick(canvasPoint);
}

/*--------------------Start the Game!!!----------------------*/

function getStateRectangle(){
  var np = getNextPipe();
  if(np===null||np===undefined){
    return null;
  }
  var p1 = new Point(flappyBird.x+flappyBird.width, flappyBird.y+flappyBird.width);
  var p2 = new Point(np.x+np.width, np.y);

  p1 = camera.translatePoint(p1.x, p1.y);
  p2 = camera.translatePoint(p2.x, p2.y);
  //console.log(p1);
  //console.log(p2);
  r = new Rectangle(p1,p2);
  return r;
}
function getFlappyBird(){
  return flappyBird;
}

function flappyGame(){

}
var callback = null;
var callbackFreq = 10;
flappyGame.getFlappyBird = getFlappyBird;
flappyGame.startGame = startGame;
flappyGame.getNextPipe = getNextPipe;
flappyGame.restart = restartGame;
flappyGame.getStateRectangle = getStateRectangle;
flappyGame.simulateClick = function(){
  jumpEventNotifier.notifyJumpEvent();
  finger.touch();
};
flappyGame.mouseClick = function(e){
  //console.log("mc" + e);
  playButton.onClick(e);
    //canvasClick(e);
};

flappyGame.requestFunction = function(func, frames){
  callback = func;
  callbackFreq = frames;

};
flappyGame.disableInput = false;

flappyGame.calculateMomentum = function(){
  var mom = 0;
  for(var i = 0; i<activeForces.length; i++){
    if(activeForces[i].dirty){
      continue;
    }
    if(activeForces[i] instanceof GravityForce){
      mom += activeForces[i].gravityForce;
    }
    else if(activeForces[i] instanceof JumpForce){
      mom -= activeForces[i].strength;
    }

  }
  //console.log(mom);
  if(mom>0){
    return true;
  }
  else{
    return false;
  }
};
startGame();


return flappyGame;


/*------------------------API------------------------------------*/




/*--------------------Snow Effect---------------------------------*/

function SnowEffect(){

  //canvas dimensions
  this.W = screen_width;
  this.H = screen_height;
  //canvas.width = W;
  //canvas.height = H;

  //snowflake particles
  this.mp = 25; //max particles
  this.particles = [];
  for(var i = 0; i < this.mp; i++)
  {
    this.particles.push({
      x: Math.random()*this.W, //x-coordinate
      y: Math.random()*this.H, //y-coordinate
      r: Math.random()*4+1, //radius
      d: Math.random()*this.mp //density
    });
  }

  //Lets draw the flakes
  this.draw = function()
  {
    //ctx.clearRect(0, 0, this.W, this.H);
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    for(var i = 0; i < this.mp; i++)
    {
      var p = this.particles[i];
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2, true);
    }
    ctx.fill();
    this.update();
    //console.log("I am being drawn?");
  };

  //angle will be an ongoing incremental flag. Sin and Cos functions will be applied to it to create vertical and horizontal movements of the flakes
  this.angle = 0;
  this.update = function()
  {
    this.angle += 0.01;
    for(var i = 0; i < this.mp; i++)
    {
      var p = this.particles[i];
      p.y += Math.cos(this.angle+p.d) + 1 + p.r/2;
      p.x += Math.sin(this.angle) * 2;

      //Sending flakes back from the top when it exits
      //Lets make it a bit more organic and let flakes enter from the left and right also.
      if(p.x > this.W+5 || p.x < -5 || p.y > this.H)
      {
        if(i%3 > 0) //66.67% of the flakes
        {
          this.particles[i] = {x: Math.random()*this.W, y: -10, r: p.r, d: p.d};
        }
        else
        {
          //If the flake is exitting from the right
          if(Math.sin(this.angle) > 0)
          {
            //Enter from the left
            this.particles[i] = {x: -5, y: Math.random()*this.H, r: p.r, d: p.d};
          }
          else
          {
            //Enter from the right
           this.particles[i] = {x: this.W+5, y: Math.random()*this.H, r: p.r, d: p.d};
          }
        }
      }
    }
  };
}

/*****/





})();