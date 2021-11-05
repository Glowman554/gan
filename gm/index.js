import { execute_gm_task, print_gmfile_info } from "./gmfile.js";
import { to_bool } from "./utils.js";

async function main() {
	if (Deno.args.length < 1) {
		console.error("Usage: gm <command>");
		return;
	}

	var command_copy = Object.assign([], Deno.args);
	var command = command_copy.shift();

	switch (command) {
		case "run":
			{
				var tasks = [];

				while (command_copy.length > 0) {
					tasks.push(command_copy.shift());
				}

				console.log("Running tasks:", tasks.join(", "));
		
				var gmfile = JSON.parse(Deno.readTextFileSync("gmfile.json"));
		
				for (var i = 0; i < tasks.length; i++) {
					await execute_gm_task(gmfile, tasks[i]);
				}
			}
			break;
		
		case "info":
			{
				var gmfile = JSON.parse(Deno.readTextFileSync("gmfile.json"));

				print_gmfile_info(gmfile);
			}
			break;

		case "init":
			{
				var gmfile_obj = {
					"name": "",
					"description": "",
					"author": "",
					"version": "0.0.1",
					"tasks": {},
					"variables": {},
				};
				
				gmfile_obj.name = prompt("Name: ");
				gmfile_obj.description = prompt("Description: ");
				gmfile_obj.author = prompt("Author: ");

				var gmfile_json = JSON.stringify(gmfile_obj, null, 4);
				Deno.writeTextFileSync("gmfile.json", gmfile_json);
			}
			break;
		
		case "add-task":
			{
				var gmfile_obj = JSON.parse(Deno.readTextFileSync("gmfile.json"));

				var task_name = prompt("Task name: ");
				var task_command = prompt("Task commands (separated by ,): ");
				var task_depend = prompt("Task dependencies (separated by ,): ");
				var run_after = prompt("Run after task (separated by ,): ");
				var run_in = prompt("Run in: ");
				var allow_fail = to_bool(prompt("Allow fail: "));
				var run_for = prompt("Run for (file extension without .): ");

				var task_obj = {
					"commands": (task_command != "" && task_command != null) ? task_command.split(",").map(x => x.trim()) : [],
					"depend": (task_depend != "" && task_depend != null) ? task_depend.split(",").map(function(depend) { return depend.trim(); }) : undefined,
					"run_after": (run_after != "" && run_after != null) ? run_after.split(",").map(function(run_after) { return run_after.trim(); }) : undefined,
					"run_in": (run_in != "" && run_in != null) ? run_in : undefined,
					"allow_fail": allow_fail,
					"run_for": (run_for != "" && run_for != null) ? run_for : undefined,
				};

				gmfile_obj.tasks[task_name] = task_obj;
				Deno.writeTextFileSync("gmfile.json", JSON.stringify(gmfile_obj, null, 4));
			}
			break;
		
		case "add-variable":
			{
				var gmfile_obj = JSON.parse(Deno.readTextFileSync("gmfile.json"));

				var variable_name = prompt("Variable name: ");
				var variable_value = prompt("Variable value: ");

				if (!gmfile_obj.variables) {
					gmfile_obj.variables = {};
				}

				gmfile_obj.variables[variable_name] = variable_value;

				Deno.writeTextFileSync("gmfile.json", JSON.stringify(gmfile_obj, null, 4));
			}
		
		case "remove-task":
			{
				var gmfile_obj = JSON.parse(Deno.readTextFileSync("gmfile.json"));
				var task_name = command_copy.shift();

				delete gmfile_obj.tasks[task_name];

				Deno.writeTextFileSync("gmfile.json", JSON.stringify(gmfile_obj, null, 4));
			}
			break;

		case "help":
			{
				console.log("Usage: gm <command>\n");
				console.log("Commands:");
				console.log("> init");
				console.log("> info");
				console.log("> add-task");
				console.log("> add-variable");
				console.log("> remove-task");
				console.log("> run");
				console.log("> help");
			}
			break;

		default:
			throw new Error("Unknown command: " + command);
	}
}

main();