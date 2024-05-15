export async function getPropertyById(id: string) {
  const url = `${process.env.BASE_API_URL}/api/v1/listings?id=${id}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to get property (ListingId): ${id}`);
  }

  return res.json();
}

export async function getProperties(searchTerm: string) {
  //   await new Promise((resolve) => setTimeout(resolve, 2000)); // TODO: remove
  const url = `${process.env.BASE_API_URL}/api/reso/test?searchTerm=${searchTerm}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to search for ${searchTerm}`);
  }

  return res.json();
}
