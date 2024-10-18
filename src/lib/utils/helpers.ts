export function compareArrays(array1: string[], array2: string[]) {
  if (array1.length !== array2.length) {
    return false;
  }

  array1.sort();
  array2.sort();

  for (let i = 0; i < array1.length; i++) {
    if (array1[i] !== array2[i]) {
      return false;
    }
  }

  return true;
}
