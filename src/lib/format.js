export const imageUrl = (id, width = 1000) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=82`;
export const formatNaira = value => '₦' + Number(value).toLocaleString('en-NG');
