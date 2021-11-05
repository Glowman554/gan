for (let i = 0; i < 200; i++) {
	Deno.writeFileSync(`${Deno.cwd()}/test_file_${i}.txt`, new TextEncoder().encode(`test_file_${i}\n`));
}