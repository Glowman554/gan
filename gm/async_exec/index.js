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
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		console.log("async_exec: adding task");

		let this_func = (async () => {
			let commands = task_obj.commands_async.map(command => command.replace(/\${file}/gm, file));

			let fake_task_obj = Object.assign({}, task_obj);
			fake_task_obj.commands = commands;

			lookup_findall(fake_task_obj);
			lookup_variables(gmfile_obj, fake_task_obj);

			await run_in_dir(fake_task_obj, async () => {
				await run_commands(fake_task_obj.commands, task_obj.allow_fail);
			});

			console.log("async_exec: task complete");
			var element_idx = window.async_exec.tasks.findIndex(task => task === this_func);
			window.async_exec.tasks.splice(element_idx, 1);
		})();

		window.async_exec.tasks.push(this_func);

	} else {
		while (window.async_exec.tasks.length) {
			console.log("async_exec: waiting for tasks...");
			await new Promise(resolve => setTimeout(resolve, 1));
		}

		console.log("async_exec: all tasks complete deleting window.async_exec");
		delete window.async_exec;
	}
}

(() => {true ? null : __run__()})() // fool the bundler into thinking that we use __run__