async function __run__(gmfile_obj, task_obj, file) {
	if (!window.async_exec) {
		window.async_exec = {
			num_tasks_max: 8,
			tasks: [],
		};

		console.log("async_exec: initializing");
	}

	if (file) {
		while (window.async_exec.tasks.length >= window.async_exec.num_tasks_max) {
			console.log("async_exec: too many tasks waiting...");
			await new Promise(resolve => setTimeout(resolve, 10));
		}

		console.log("async_exec: adding task");

		let this_func = (async () => {
			let commands = task_obj.commands_async.map(command => command.replace(/\${file}/gm, file));

			lookup_findall(task_obj);
			lookup_variables(gmfile_obj, task_obj);

			await run_in_dir(task_obj, async () => {
				await run_commands(commands, task_obj.allow_fail);
			});

			console.log("async_exec: task complete");
			window.async_exec.tasks = window.async_exec.tasks.filter(task => task === this_func);
		})();

		window.async_exec.tasks.push(this_func);
	} else {
		console.log("async_exec: waiting for tasks...");
		for (let task of window.async_exec.tasks) {
			await task;
		}

		delete window.async_exec;
	}
}

(() => {true ? null : __run__()})() // fool the bundler into thinking that we use __run__