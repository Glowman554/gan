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

	console.log("Running task: " + task_name);

	var current_dir = Deno.cwd();

	if (task_obj.run_in != undefined) {
		console.log("Changing directory to: " + task_obj.run_in);
		Deno.chdir(task_obj.run_in);
	}

	for (var i = 0; i < task_obj.commands.length; i++) {
		var command = task_obj.commands[i];

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

		task_obj.commands[i] = command;
	}

	await run_commands(task_obj.commands, task_obj.allow_fail);

	Deno.chdir(current_dir);

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