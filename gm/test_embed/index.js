async function __run__(gmfile_obj, task_obj, file) {
	if (file) {
		await Deno.readTextFile(file).then(function (data) {
			console.log(data);
		});
	} else {
		console.log("Hello World");
	}
}

(() => {true ? null : __run__()})() // fool the bundler into thinking that we use __run__