// Set by the deploy workflow from the repository it runs in, so forks work automatically.
export const REPO = process.env.NEXT_PUBLIC_REPO || "AlexRayyan/Interview-preparation";
export const REPO_URL = `https://github.com/${REPO}`;
export const SHARE_URL = `${REPO_URL}/issues/new?template=share-interview.yml`;
