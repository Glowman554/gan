export function to_bool(str) {
	if(str == "y" || str == "yes") {
		return true;
	} else if(str == "n" || str == "no") {
		return false;
	}
	return false;
}