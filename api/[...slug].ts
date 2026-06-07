import app from '../server';
export default (req: any, res: any) => {
    // Vercel might strip the /api prefix or keep it.
    // If it stripped it, add it back so Express routes match.
    if (req.url && !req.url.startsWith('/api')) {
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    console.log("Vercel API Route Hit:", req.url);
    return app(req, res);
};
