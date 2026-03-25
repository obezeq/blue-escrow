import { app } from './app.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[api] Server running on port ${PORT}`);
});
