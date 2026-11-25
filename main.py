import logging, sys, operator
from typing import TypedDict, Annotated, Sequence, Any, Tuple

from langgraph.graph import StateGraph, END


logging.basicConfig(stream=sys.stdout, level=logging.ERROR)


class FullToolState(TypedDict):
    messages: Annotated[Sequence[Any], operator.add]
    current_tool: str
    input_parameters: dict
    data_path_train: str
    data_path_test: str
    package_name: str
    agent_info_miner: Any
    agent_code_generator: Any
    agent_reviewer: Any
    agent_evaluator: Any
    agent_optimizer: Any
    vectorstore: Any
    code_quality: Any | None
    should_rerun: bool
    agent_processor: Any
    agent_selector: Any | None
    experiment_config: dict | None
    results: dict | None
    algorithm_doc: str | None
    log_fn: Any
    investigation: Any


def call_processor(state: FullToolState) -> dict:
    state["log_fn"]("[Processor] Starting pipeline…")
    state["log_fn"](f"[Processor] Parsed config → {state['experiment_config']}")
    return state


def call_selector(state: FullToolState) -> dict:
    from agents.agent_selector import AgentSelector
    state["log_fn"]("[Selector] Loading dataset(s) & selecting algorithm…")
    selector = AgentSelector(state["experiment_config"])
    state.update(
        agent_selector=selector,
        input_parameters=selector.parameters,
        data_path_train=selector.data_path_train,
        data_path_test=selector.data_path_test,
        package_name=selector.package_name,
        vectorstore=selector.vectorstore,
        current_tool=selector.tools[0],
    )
    state["log_fn"](f"[Selector] Final model → {state['current_tool']}")
    return state


def call_info_miner(state: FullToolState) -> dict:
    tool = state["current_tool"]
    state["log_fn"](f"[InfoMiner] Fetching documentation for {tool}…")
    doc = state["agent_info_miner"].query_docs(tool, state["vectorstore"], state["package_name"])
    return {"algorithm_doc": doc}


def call_code_generator(state: FullToolState) -> dict:
    from entity.code_quality import CodeQuality
    tool = state["current_tool"]
    state["log_fn"](f"[CodeGen] Generating executable code for {tool}…")
    code = state["agent_code_generator"].generate_code(
        tool,
        state["data_path_train"],
        state["data_path_test"],
        state["algorithm_doc"],
        state["input_parameters"],
        state["package_name"]
    )
    params = state["agent_code_generator"]._extract_init_params_dict(state["algorithm_doc"])
    state["code_quality"] = CodeQuality(code, tool, params, "", "", -1, -1, [], 0)
    return state


def call_reviewer(state: FullToolState):
    tool = state["current_tool"]
    state["log_fn"](f"[Reviewer] Validating code for {tool}…")
    passed, _ = state["agent_reviewer"].test_code(
        state["code_quality"].code, tool, state["package_name"]
    )
    if not passed:
        raise RuntimeError(f"Reviewer could not validate the {tool} test script.")
    # The reviewer executes a synthetic-data harness. The evaluator needs the original dataset script.
    return state


def call_evaluator(state: FullToolState):
    tool = state["current_tool"]
    state["log_fn"](f"[Evaluator] Running full execution for {tool}…")
    final = state["agent_evaluator"].execute_code(state["code_quality"].code, tool)
    if getattr(final, "error_message", ""):
        raise RuntimeError(f"{tool} evaluation failed: {final.error_message}")
    state["code_quality"] = final
    return state


def recorded_metric(value):
    return value if isinstance(value, (float, int)) and not isinstance(value, bool) and 0 <= value <= 1 else None


def call_optimizer(state: FullToolState):
    tool = state["current_tool"]
    state["log_fn"](f"[Finish] Completed → {tool} ✅")

    cq = state["code_quality"]

    final_result = {
        "algorithm": tool,
        "dataset_train": state["data_path_train"],
        "dataset_test": state["data_path_test"],
        "parameters": state["input_parameters"] or {},
        "code": getattr(cq, "code", ""),
        "std_output": getattr(cq, "std_output", ""),
        "error_message": getattr(cq, "error_message", ""),
        "review_count": getattr(cq, "review_count", 0),
        "metric_source": "script-reported",
        "metrics": {
            "auroc": recorded_metric(getattr(cq, "auroc", None)),
            "auprc": recorded_metric(getattr(cq, "auprc", None)),
        }
    }

    state["results"] = final_result
    return state


STAGES = (
    ("processor", "Processor", call_processor),
    ("selector", "Selector", call_selector),
    ("info", "Info Miner", call_info_miner),
    ("code", "Code Generator", call_code_generator),
    ("review", "Reviewer", call_reviewer),
    ("eval", "Evaluator", call_evaluator),
    ("opt", "Optimizer", call_optimizer),
)


def dispatch(name, research_step):
    def run_stage(state: FullToolState):
        investigation = state.get("investigation")
        if investigation is None:
            return research_step(state)
        investigation.run_stage(name)
        return {"current_tool": name}
    return run_stage


graph = StateGraph(FullToolState)
for stage, _, research_step in STAGES:
    graph.add_node(stage, dispatch(stage, research_step))
graph.set_entry_point(STAGES[0][0])
for previous, following in zip(STAGES, STAGES[1:]):
    graph.add_edge(previous[0], following[0])
graph.add_edge(STAGES[-1][0], END)

compiled_full_graph = graph.compile()


if __name__ == "__main__":
    from agents.agent_processor import AgentProcessor
    from agents.agent_info_miner import AgentInfoMiner
    from agents.agent_code_generator import AgentCodeGenerator
    from agents.agent_reviewer import AgentReviewer
    from agents.agent_evaluator import AgentEvaluator
    from agents.agent_optimizer import AgentOptimizer
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    import argparse
    parser = argparse.ArgumentParser(description="Run AD-Agent pipeline")
    parser.add_argument("--cmd", type=str, default="", help="Command (e.g. 'Run IForest on ./data/yahoo_train.csv')")
    parser.add_argument("-p", "--parallel", action="store_true", help="Parallel mode")
    parser.add_argument("-o", "--optimizer", action="store_true", help="Optimizer mode")
    args = parser.parse_args()

    cmd = args.cmd
    if not cmd:
        cmd = input("Enter command (e.g. 'Run IForest on ./data/yahoo_train.csv and ./data/yahoo_test.csv'): ").strip()

    if cmd:
        processor = AgentProcessor()
        cfg = processor.process_command(cmd)

        state: FullToolState = {
            "messages": [],
            "current_tool": "",
            "input_parameters": {},
            "data_path_train": "",
            "data_path_test": "",
            "package_name": "",
            "agent_info_miner": AgentInfoMiner(),
            "agent_code_generator": AgentCodeGenerator(),
            "agent_reviewer": AgentReviewer(),
            "agent_evaluator": AgentEvaluator(),
            "agent_optimizer": AgentOptimizer(),
            "vectorstore": None,
            "code_quality": None,
            "should_rerun": False,
            "agent_processor": processor,
            "agent_selector": None,
            "experiment_config": cfg,
            "results": None,
            "algorithm_doc": None,
            "log_fn": print,
        }

        final = compiled_full_graph.invoke(state)
        print("\n=== Final Pipeline Results ===")
        print(final.get("results"))
