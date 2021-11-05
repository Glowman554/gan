import getFiles from "https://deno.land/x/getfiles/mod.ts";



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

				lookup_variables(gmfile_obj, task_obj_copy);

				await run_in_dir(task_obj_copy, async () => {
					await run_commands(task_obj_copy.commands, task_obj_copy.allow_fail);
				});
			}
		}

		await run_task_after(gmfile_obj, task_obj);
	} else {

		console.log("Running task: " + task_name);

		lookup_variables(gmfile_obj, task_obj);

		await run_in_dir(task_obj, async () => {
			await run_commands(task_obj.commands, task_obj.allow_fail);
		});

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