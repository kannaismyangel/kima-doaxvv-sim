self.onmessage = function(e) {
  let data = e.data;
  switch(data.action) {
    case 'setup':
      setupWorker(data.params);
      break;
    case 'simulate':
      simulate(data.params);
      break;
    case 'stop':
      stop();
      break;
    default:
      console.log("unrecognized!");
  }
}

function setupWorker(params) {
  console.log("setup!");
  self.remainingSimulations = 0;
  self.conf = {
    gacha: {
      ticketRolls: params.ticketRolls,
      ticketRatioGen: createRatioGenFunc(params.ticketRatio),
      freeRolls: params.freeRolls,
      freeRatioGen: createRatioGenFunc(params.freeRatio),
      paidRolls: params.paidRolls,
      paidRatioGen: createRatioGenFunc(params.paidRatio),
    },
    sim: {
      totalGirls: params.totalGirls,
      mainGirls: params.mainGirls,
      desiredCopies: params.desiredCopies,
      everyGirl: params.everyGirl,
    }
  }
  self.simCount = 0;
}

function createRatioGenFunc(gen) {
  if (gen.simple) {
    return () => {return createArrRatioGeneratorFunc(gen.val)};
  } else {
    return constructCustomRatioGenFunc(gen.val);
  }
}

function* createArrRatioGeneratorFunc(arr) {
  let i = 0;
  while (true) {
    yield arr[i++ % arr.length];
  }
}

function constructCustomRatioGenFunc(code) {
  let GeneratorFunction = (function* () {}).constructor;
  return new GeneratorFunction('rolls', code);
}


function simulate(params) {
  console.log("simulate!");
  self.remainingSimulations += params.times;
  executeSimulation();
}

function executeSimulation() {
  console.log("remaining:" + self.remainingSimulations)
  if (self.remainingSimulations <= 0) {
    postMessage({
      state:"simulationComplete",
    });
    return;
  }

  self.remainingSimulations--;
  let gacha = createGacha(self.conf.gacha);
  let result = executeRolls(self.conf.sim, gacha);
  postMessage({
    state:"simResult",
    result: result,
  });
  setTimeout(executeSimulation);
}

function executeRolls(conf, gachaRng) {
  let girls = Array(conf.totalGirls).fill(0);
  let rollCountAtGoal = 0;
  let ssrsToGoal = 0;
  let ssrsAfterGoal = 0;
  for (let ssr of gachaRng) {
    if (!girlsGotSSRs(girls, conf.mainGirls, conf.desiredCopies, conf.everyGirl)) {
      rollCountAtGoal++;
      if (ssr) {
        let randomGirl = Math.floor(Math.random() * girls.length);
        girls[randomGirl]++;
        ssrsToGoal++;
        ssrsAfterGoal++;
      }
    } else if (ssr) {
      ssrsAfterGoal++;
    }
  }
  return {
    id: simCount++,
    success: girlsGotSSRs(girls, conf.mainGirls, conf.desiredCopies, conf.everyGirl),
    girls: girls,
    ssrsToGoal: ssrsToGoal,
    ssrsAfterGoal: ssrsAfterGoal,
    rollCount: rollCountAtGoal,
    remainingSimulations: remainingSimulations,
  };
}

function girlsGotSSRs(allGirls, numMainGirls, desiredCopies, everyGirl) {
  if (desiredCopies == -1) {
    return false;
  }
  let targetGirls = allGirls.slice(0, numMainGirls);
  let withSSR = targetGirls.filter(copies => copies >= desiredCopies);
  return everyGirl ? withSSR.length >= numMainGirls : withSSR.length >= 1;
}

function* createGacha(conf) {
  let ticketRatio = conf.ticketRatioGen();
  for (let i = 0; i < conf.ticketRolls; i++) {
    yield Math.random() < ticketRatio.next().value;
  }
  let freeRatio = conf.freeRatioGen();
  for (let i = 0; i < conf.freeRolls; i++) {
    yield Math.random() < freeRatio.next().value;
  }
  let paidRatio = conf.paidRatioGen();
  for (let i = 0; i < conf.paidRolls; i++) {
    yield Math.random() < paidRatio.next().value;
  }
  return;
}

function stop() {
  self.remainingSimulations = 0;
}
