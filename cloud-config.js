// Add the project's public Supabase URL and publishable/anon key here.
// Never put a service-role key in this file or in frontend code.
export const cloudConfig = {
  url: '',
  publicKey: '',
  table: 'harmonie_content',
  rowId: 'main',
  bucket: 'harmonie-media'
};

export const cloudIsConfigured = () => Boolean(cloudConfig.url && cloudConfig.publicKey);
