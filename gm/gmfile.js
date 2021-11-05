import getFiles from "https://deno.land/x/getfiles/mod.ts";
import { merge_obj } from "./utils.js";

export function load_gmfile(file_path) {
	var gmfile_obj = {};

	var gmfile_json = Deno.readTextFileSync(file_path);
	gmfile_obj = JSON.parse(gmfile_json);

	if (gmfile_obj.include) {
		for (var i = 0; i < gmfile_obj.include.length; i++) {
			console.log(`Including file: ${gmfile_obj.include[i]}`);
			var subfile = load_gmfile(gmfile_obj.include[i]);
			
			delete subfile.name;
			delete subfile.description;
			delete subfile.author;
			delete subfile.version;
			delete subfile.include;

			gmfile_obj = merge_obj(gmfile_obj, subfile);

		}
	}

	return gmfile_obj;
}

async function run_commands(commands, allow_failure = false) {
	for (let command of commands) {
		console.log(`> ${command}`);

		let p = Deno.run({
			cmd: command.split(" "),
			stdout: "inherit",
			stderr: "inherit"
		});

		var status = await p.status();

		if (!status.success) {
			if (!allow_failure) {
				throw new Error(`Command failed: ${command}`);
			} else {
				console.log(`Command failed: ${command}`);
			}
		}
	}
}

function lookup_variables(gmfile_obj, task_obj) {
	for (var x = 0; x < task_obj.commands.length; x++) {
		var command = task_obj.commands[x];

		var variables_in_command = command.match(/\$\{[^}]+\}/g);
		if (variables_in_command !== null) {
			for (var j = 0; j < variables_in_command.length; j++) {
				var variable_name = variables_in_command[j].substring(2, variables_in_command[j].length - 1);
				
				if (!gmfile_obj.variables || !gmfile_obj.variables[variable_name]) {
					throw new Error("Variable not found: " + variable_name);
				}

				var variable_value = gmfile_obj.variables[variable_name];

				console.log(`Replacing variable ${variable_name} with value "${variable_value}"`);

				command = command.replace(variables_in_command[j], variable_value);
			}
		}

		task_obj.commands[x] = command;
	}
}

async function run_in_dir(task_obj, func) {
	var current_dir = Deno.cwd();

	if (task_obj.run_in != undefined) {
		console.log("Changing directory to: " + task_obj.run_in);
		Deno.chdir(task_obj.run_in);
	}

	await func();

	Deno.chdir(current_dir);
}

async function run_task_after(gmfile_obj, task_obj) {
	if (task_obj.run_after != undefined) {
		var run_after_task_names = [];

		for (var i = 0; i < task_obj.run_after.length; i++) {
			run_after_task_names.push(task_obj.run_after[i]);
		}

		console.log("Running task after: " + run_after_task_names.join(", "));

		for (var i = 0; i < run_after_task_names.length; i++) {
			await execute_gm_task(gmfile_obj, run_after_task_names[i]);
		}
	}
}

function lookup_findall(task_obj) {
	for (var x = 0; x < task_obj.commands.length; x++) {
		var command = task_obj.commands[x];

		var findall_in_command = command.match(/\$\{findall [A-Za-z0-9_]+\}/g);

		if (findall_in_command !== null) {
			for (var j = 0; j < findall_in_command.length; j++) {
				var extension_to_search = findall_in_command[j].substring(10, findall_in_command[j].length - 1);

				var files_found = [];
				var files = getFiles(".");

				for (var k = 0; k < files.length; k++) {
					if (files[k].ext == extension_to_search) {
						files_found.push(files[k].path);
					}
				}

				console.log(`Found ${files_found.length} files with extension ${extension_to_search}`);
				task_obj.commands[x] = command.replace(findall_in_command[j], files_found.join(" "));
			}
		}
	}
}

async function run_embedded_code(gmfile_obj, task_obj, file = undefined) {
	if (task_obj.run_js) {
		console.log("Running embedded code in file: " + task_obj.run_js);

		var code_to_run = Deno.readTextFileSync(task_obj.run_js);

		{
			await new Promise((resolve, reject) => {
				eval(code_to_run + "\n\n\n __run__(gmfile_obj, task_obj, file).then(resolve);");
			});
		}
	}
}

export async function execute_gm_task(gmfile_obj, task_name) {
	var task_obj = gmfile_obj.tasks[task_name];


	
	if (task_obj === undefined) {
		throw new Error("task not found: " + task_name);
	}

	if (task_obj.depend !== undefined) {
		var depend_task_names = [];

		for (var i = 0; i < task_obj.depend.length; i++) {
			depend_task_names.push(task_obj.depend[i]);
		}

		console.log("Running task dependencies: " + depend_task_names.join(", "));

		for (var i = 0; i < depend_task_names.length; i++) {
			await execute_gm_task(gmfile_obj, depend_task_names[i]);
		}
	}

	if (task_obj.run_for) {
		console.log("Running task for every ." + task_obj.run_for + " file");

		var files = await getFiles(".");

		for (var i = 0; i < files.length; i++) {
			if (files[i].ext === task_obj.run_for) {
				console.log("Running task for file: " + files[i].path);

				var task_obj_copy = Object.assign({}, task_obj);

				task_obj_copy.commands = task_obj.commands.map(command => command.replace(/\${file}/gm, files[i].path));

				lookup_findall(task_obj_copy);
				lookup_variables(gmfile_obj, task_obj_copy);

				await run_in_dir(task_obj_copy, async () => {
					await run_commands(task_obj_copy.commands, task_obj_copy.allow_fail);
				});

				await run_embedded_code(gmfile_obj, task_obj_copy, files[i].path);
			}
		}

		await run_task_after(gmfile_obj, task_obj);
	} else {

		console.log("Running task: " + task_name);

		lookup_findall(task_obj);
		lookup_variables(gmfile_obj, task_obj);

		await run_in_dir(task_obj, async () => {
			await run_commands(task_obj.commands, task_obj.allow_fail);
		});

		await run_embedded_code(gmfile_obj, task_obj);

		await run_task_after(gmfile_obj, task_obj);
	}
}

export function print_gmfile_info(gmfile_obj) {
	console.log("Project information:");
	console.log("> name: " + gmfile_obj.name);
	console.log("> description: " + gmfile_obj.description);
	console.log("> author: " + gmfile_obj.author);
	console.log("> version: " + gmfile_obj.version);
	console.log("> tasks: " + Object.keys(gmfile_obj.tasks).join(", "));

	if (gmfile_obj.variables) {
		console.log("> variables:");
		for (var variable_name in gmfile_obj.variables) {
			console.log(`> > ${variable_name}: ${gmfile_obj.variables[variable_name]}`);
		}
	}
}