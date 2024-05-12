export async function getProperties(searchTerm: string) {
  //   await new Promise((resolve) => setTimeout(resolve, 2000)); // TODO: remove
  const url = `${process.env.BASE_API_URL}/api/reso/test?searchTerm=${searchTerm}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to search for ${searchTerm}`);
  }

  return res.json();
}
