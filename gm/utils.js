export function to_bool(str) {
	if(str == "y" || str == "yes") {
		return true;
	} else if(str == "n" || str == "no") {
		return false;
	}
	return false;
}

export function merge_obj(obj1, obj2) {
	for(var key in obj2) {
		if (typeof obj2[key] === 'object' && obj2[key] !== null && !(obj2[key] instanceof Array)) {
			console.log(`Merging sub-object ${key}`);
			if (obj1[key] === undefined) {
				obj1[key] = {};
			}
			obj1[key] = merge_obj(obj1[key], obj2[key]);
		} else {
			console.log(`Merging ${key}`);
			obj1[key] = obj2[key];
		}
	}

	return obj1;
}