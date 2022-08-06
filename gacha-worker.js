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
  self.simulatorSettings = params.simulatorSettings;
  self.simCount = 0;
}

function simulate(params) {
  console.log("simulate!");
  self.remainingSimulations = params.times;
  executeSimulation();
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

function executeSimulation() {
  if (self.remainingSimulations <= 0) {
    postMessage({
      state:"simulationComplete",
    });
    return;
  }
  
  self.remainingSimulations--;
  let gacha = createGacha(600, [0.011], 1000, [0.011, 0.011, 0.033], 1000, [0.033]);
  let result = executeRolls(7, 3, 5, gacha);
  postMessage({
    simId: simCount++,
    state:"simResult",
    result: result,
  });
  setTimeout(executeSimulation);
}

function executeRolls(numTotalGirls, numMainGirls, numDesiredCopies, gachaRng) {
  let girls = Array(numTotalGirls).fill(0);
  let rollCount = 0;
  for (let ssr of gachaRng) {
    if (girlsGotSSRs(girls, numMainGirls, numDesiredCopies)) {
      break;
    }

    rollCount++;
    if (ssr) {
      let randomGirl = Math.floor(Math.random() * girls.length);
      girls[randomGirl]++;
    }
  }
  return {
    success: girlsGotSSRs(girls, numMainGirls, numDesiredCopies),
    girls: girls,
    rollCount: rollCount,
  };
}

function girlsGotSSRs(allGirls, numMainGirls, desiredCopies) {
  let targetGirls = allGirls.slice(0, numMainGirls);
  let withSSR = targetGirls.filter(copies => copies > desiredCopies);
  return withSSR.length >= numMainGirls;
}

function* createGacha(ticketRolls, ticketRatios, freeRolls, freeRatios, paidRolls, paidRatios) {
  let ticketRatioGen = createRatioGenerator(ticketRatios);
  for (let i = 0; i < ticketRolls; i++) {
    yield Math.random() < ticketRatioGen.next().value;
  }
  let freeRatioGen = createRatioGenerator(freeRatios);
  for (let i = 0; i < freeRolls; i++) {
    yield Math.random() < freeRatioGen.next().value;
  }
  let paidRatioGen = createRatioGenerator(paidRatios);
  for (let i = 0; i < paidRolls; i++) {
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
