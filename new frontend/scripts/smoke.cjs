/* Browser acceptance test against a real API, external worker and isolated database. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { createInterface } = require("node:readline");
const { chromium } = require("playwright-core");

const root = path.resolve(__dirname, "../..");
const venv = path.join(root, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const python = process.env.PYTHON || (fs.existsSync(venv) ? venv : "python");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ad-agent-browser-"));
const researchStore = path.join(temp, "research.json");
const env = {...process.env, AD_AGENT_DB:path.join(temp,"test.sqlite3"), AD_AGENT_WORKERS:"0", AD_AGENT_RESEARCH_STORE:researchStore};
const children = [];
function child(args) {
  const p = spawn(python,args,{cwd:root,env,windowsHide:true,stdio:["ignore","pipe","inherit"]});
  children.push(p);
  return p;
}
async function stop(p) {
  if (p.exitCode !== null || p.signalCode !== null) return;
  const stopped = once(p, "exit");
  p.kill();
  await stopped;
}
async function main(){
  let browser, page;
  try {
    fs.writeFileSync(researchStore, JSON.stringify({
      jobs:{
        "sample-running":{job_id:"sample-running",status:"running",train_path:"fixture.csv"},
        "sample-completed":{job_id:"sample-completed",status:"completed",train_path:"fixture.csv"},
        "sample-reported":{job_id:"sample-reported",status:"completed",train_path:"another.csv"}
      },
      results:{
        "sample-completed":{algorithm:"Fixture detector",metrics:{auroc:0.9999}},
        "sample-reported":{algorithm:"Reported fixture",metric_source:"script-reported",metrics:{auroc:0.625,auprc:0.375}}
      }, feedback:[]
    }));
    const server = child(["-u","-c",[
      "from werkzeug.serving import make_server","from server import app",
      "http=make_server('127.0.0.1',0,app,threaded=True)","print('URL',http.server_port,flush=True)","http.serve_forever()"
    ].join("\n")]);
    const lines = createInterface({input:server.stdout});
    let origin;
    for await (const line of lines) {if(line.startsWith("URL ")) {origin="http://127.0.0.1:"+line.slice(4);break;}}
    assert.ok(origin, "API startup failed");
    browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {})});
    page = await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
    page.setDefaultTimeout(18000);
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto(origin);
    await page.getByRole("button",{name:"Explore incident"}).click();
    await page.getByText("queued",{exact:true}).waitFor();
    const queued=page.url();
    await page.reload();
    await page.getByText("queued",{exact:true}).waitFor();
    assert.equal(page.url(),queued);
    child(["-m","investigations.worker"]);
    await page.getByRole("heading",{name:"Incident timeline"}).waitFor();
    assert.match(page.url(),/\/incidents\/\d+$/);
    const record = page.getByLabel("Inspect record");
    await record.waitFor();
    await record.selectOption({index:0});
    await page.getByRole("heading",{name:"Investigation evidence"}).waitFor();
    const save = process.argv.includes("--screenshots");
    if(save) await page.screenshot({path:path.join(root,"docs","incident.png"),fullPage:true});
    await page.getByRole("link",{name:"Inspect run",exact:true}).click();
    await page.getByRole("heading",{name:"Agent trace"}).waitFor();
    assert.equal(await page.locator(".stage-list .stage-completed").count(),7);
    await page.locator(".stage-list button").filter({hasText:"Reviewer"}).click();
    await page.getByText(/Verified split boundaries/).waitFor();
    await page.getByRole("button",{name:"Model comparison",exact:true}).click();
    await page.getByRole("button",{name:"Validation",exact:true}).click();
    await page.getByLabel("Explore validation cutoff").selectOption("0.95");
    await page.getByRole("button",{name:"Held-out test"}).click();
    await page.getByRole("link",{name:"New investigation",exact:true}).first().click();
    const briefChoice = page.getByRole("checkbox", {name:/Request a local-model brief/});
    assert.equal(await briefChoice.isChecked(), false);
    await briefChoice.check();
    await briefChoice.uncheck();
    await page.getByLabel("Observation CSV").setInputFiles(path.join(root,"data","sensor-demo.csv"));
    await page.getByRole("heading",{name:"Column mapping"}).waitFor();
    assert.equal(await page.getByRole("combobox",{name:"Anomaly label"}).inputValue(),"label");
    await page.getByRole("button",{name:"Start investigation"}).click();
    await page.getByRole("button",{name:"Incidents",exact:true}).click();
    await page.getByRole("heading",{name:"Run incidents"}).waitFor();
    await page.getByRole("link",{name:"Overview",exact:true}).click();
    await page.getByRole("link",{name:"sensor-demo.csv",exact:false}).first().waitFor();
    if(save) await page.screenshot({path:path.join(root,"docs","overview.png"),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.getByRole("button",{name:"Open menu"}).click();
    await page.getByRole("link",{name:"Benchmarks",exact:true}).click();
    await page.getByRole("heading",{name:"Detector benchmarks"}).waitFor();
    await page.getByRole("button",{name:"Exchange 4 CPM"}).click();
    await page.getByRole("heading",{name:"Exchange 4 CPM"}).waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth), "Mobile page overflows");
    for (const alias of ["/benchmarks","/models"]) {
      await page.goto(origin + alias);
      await page.waitForURL(origin + "/comparison");
      await page.reload();
      await page.getByRole("heading", {name:"Detector benchmarks"}).waitFor();
      const json = await (await page.request.get(origin + alias, {headers:{Accept:"application/json"}})).json();
      assert.ok(json.length > 0);
      assert.ok(json.every(row => row.source === "held-out benchmark"));
    }
    await page.goto(origin + "/dashboard");
    await page.waitForURL(origin + "/");
    await page.getByRole("button",{name:"Explore incident"}).waitFor();
    await page.goto(origin + "/results?jobId=sample-running");
    const processing = page.getByRole("heading",{name:"Experiment is still processing"});
    await processing.waitFor();
    const pendingEndpoint = "**/results/sample-running";
    let releasePoll;
    const holdPoll = new Promise(resolve => { releasePoll = resolve; });
    await page.route(pendingEndpoint, async route => { await holdPoll; await route.continue(); }, {times:1});
    const pollReply = page.waitForResponse(pendingEndpoint);
    try {
      await page.waitForRequest(pendingEndpoint);
      assert.ok(await processing.isVisible(), "A pending experiment must stay pending while polling");
    } finally {
      releasePoll();
      await pollReply;
    }
    await page.goto(origin + "/experiments");
    const legacy = page.getByRole("row").filter({hasText:"sample-completed"});
    await legacy.getByText("Unverified").waitFor();
    assert.equal(await legacy.getByText("0.9999").count(),0);
    const reported = page.getByRole("row").filter({hasText:"sample-reported"});
    await reported.getByText("Research script").waitFor();
    await reported.getByText("0.6250").waitFor();
    await reported.getByRole("link",{name:"View",exact:true}).click();
    await page.getByText("The generated research script reported the metrics shown here.").waitFor();
    await page.getByText("0.3750").waitFor();
    await page.goto(origin + "/results?jobId=sample-completed");
    await page.getByText(/This saved research run has unverified metrics/).waitFor();
    assert.equal(await page.getByText("0.9999").count(),0);
    await page.goto(origin + "/feedback");
    await page.getByLabel("Experiment",{exact:true}).selectOption("sample-completed");
    await page.getByLabel("Review note").fill("Check the held-out trace again.");
    const failPost = route => route.request().method() === "POST"
      ? route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"Temporary write failure"})})
      : route.continue();
    await page.route("**/feedback",failPost);
    await page.getByRole("button",{name:"Save review"}).click();
    await page.getByRole("alert").filter({hasText:"Temporary write failure"}).waitFor();
    assert.equal(await page.getByLabel("Review note").inputValue(),"Check the held-out trace again.");
    await page.unroute("**/feedback", failPost);
    await page.getByRole("button",{name:"Save review"}).click();
    await page.getByText("Your review has been saved with this experiment.").waitFor();
    const reviews = await (await page.request.get(origin + "/feedback", {headers:{Accept:"application/json"}})).json();
    assert.equal(reviews.at(-1).job_id,"sample-completed");
    assert.equal(reviews.at(-1).model,"Fixture detector");
    assert.deepEqual(errors,[]);
    console.log("PASS: sample, refresh, 7 stages, evidence, thresholds, CSV, mobile, benchmark aliases, pending results, research metric sources and feedback retry.");
  } catch (error) {
    if (page) console.error(page.url(), await page.locator("h1, h2, [role=alert]").allTextContents());
    throw error;
  } finally {
    if(browser) await browser.close();
    for(const p of children.reverse()) await stop(p);
    if(path.dirname(temp)===path.resolve(os.tmpdir()) && path.basename(temp).startsWith("ad-agent-browser-")){
      fs.rmSync(temp,{recursive:true,force:true,maxRetries:4,retryDelay:250});
    }
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
