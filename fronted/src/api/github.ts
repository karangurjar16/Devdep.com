export async function getUserRepos() {
  const res = await fetch("http://localhost:5000/github/repos", {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch repositories");
  }
console.log("hellop")
  return res.json();
}
