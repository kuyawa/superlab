const https = require('https');

class Agent {
    async exec(question){
        try {
            console.log('>>', question);
            const apiKey = process.env.AGENT_API_KEY;
            const response = await new Promise((resolve, reject) => {
                const postData = JSON.stringify({
                    model: process.env.AGENT_MODEL,
                    messages: [
                        { role: 'system', content: 'Eres un asistente de laboratorio clínico profesional. Proporciona información útil en análisis de exámenes de laboratorios sobre rangos obtenidos y posibles indicaciones. Siempre recomienda consultar con un especialista' },
                        { role: 'user', content: question }
                    ],
                    max_tokens: 5000,
                    temperature: 0.3
                });

                const options = {
                    hostname: process.env.AGENT_HOST,
                    path: process.env.AGENT_PATH,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const apiReq = https.request(options, (apiRes) => {
                    let data = '';
                    apiRes.on('data', chunk => data += chunk);
                    apiRes.on('end', () => {
                        try {
                            // /console.log('ANSWER', data)
                            const parsed = JSON.parse(data);
                            resolve(parsed.choices?.[0]?.message?.content || 'No se pudo obtener respuesta');
                        } catch (e) {
                            console.log('ERROR', e)
                            reject(e);
                        }
                    });
                });

                apiReq.on('error', reject);
                apiReq.write(postData);
                apiReq.end();
            });
            console.log('<<', response);
            return response;
        } catch (apiErr) {
            console.error('AI API error:', apiErr.message);
            return {error:'Error al conectar con AI. Por favor, intente nuevamente.'};
        }
    }
}

module.exports = Agent;