fetch("http://localhost:3000/api/download?url=https://storage.googleapis.com/sites.framerate.space/test.mp4")
  .then(res => console.log(res.status, res.headers.get("content-type")))
  .catch(console.error);
