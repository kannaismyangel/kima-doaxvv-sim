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
      ticketRatio: parseRatio(params.ticketRatio),
      freeRolls: params.freeRolls,
      freeRatio: parseRatio(params.freeRatio),
      paidRolls: params.paidRolls,
      paidRatio: parseRatio(params.paidRatio),
    },
    sim: {
      totalGirls: params.totalGirls,
      mainGirls: params.mainGirls,
      desiredCopies: params.desiredCopies,
    }
  }
  self.simCount = 0;
}

function parseRatio(s) {
  switch (s) {
    case 'all11':
      return [0.011];
    case 'all33':
      return [0.033]
    case 'every3rd':
      return [0.011, 0.011, 0.033];
    case 'every6th':
      return [0.011, 0.011, 0.011, 0.011, 0.011, 0.033]
    default:
      console.log("unrecognized rng ratio, default to 100% SSR");
      return [1];
  }
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
  let rollCount = 0;
  for (let ssr of gachaRng) {
    if (girlsGotSSRs(girls, conf.mainGirls, conf.desiredCopies)) {
      break;
    }

    rollCount++;
    if (ssr) {
      let randomGirl = Math.floor(Math.random() * girls.length);
      girls[randomGirl]++;
    }
  }
  return {
    id: simCount++,
    success: girlsGotSSRs(girls, conf.mainGirls, conf.desiredCopies),
    girls: girls,
    rollCount: rollCount,
    remainingSimulations: remainingSimulations,
  };
}

function girlsGotSSRs(allGirls, numMainGirls, desiredCopies) {
  if (desiredCopies == -1) {
    return false;
  }
  let targetGirls = allGirls.slice(0, numMainGirls);
  let withSSR = targetGirls.filter(copies => copies >= desiredCopies);
  return withSSR.length >= numMainGirls;
}

function* createGacha(conf) {
  let ticketRatioGen = createRatioGenerator(conf.ticketRatio);
  for (let i = 0; i < conf.ticketRolls; i++) {
    yield Math.random() < ticketRatioGen.next().value;
  }
  let freeRatioGen = createRatioGenerator(conf.freeRatio);
  for (let i = 0; i < conf.freeRolls; i++) {
    yield Math.random() < freeRatioGen.next().value;
  }
  let paidRatioGen = createRatioGenerator(conf.paidRatio);
  for (let i = 0; i < conf.paidRolls; i++) {
    yield Math.random() < paidRatioGen.next().value;
  }
  return;
}

function* createRatioGenerator(arr) {
  let i = 0;
  while (true) {
    yield arr[i++ % arr.length];
  }
}

function stop() {
  self.remainingSimulations = 0;
}
