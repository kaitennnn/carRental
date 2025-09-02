import { Router } from 'express';
import { MongoClient } from "mongodb";
const uri = "mongodb+srv://backendtest25:123321@car-rental.5ighfti.mongodb.net/?retryWrites=true&w=majority&appName=car-rental";
const router = Router();

router.get('/', (req, res) => res.render('index.ejs', { csrfToken: req.csrfToken(), title: '租車服務' }));

router.post('/ai/recommend', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    const client = new MongoClient(uri);
    try {
        // 解析过滤条件
        const maxPrice = (prompt.match(/\$(\d+)/) || [])[1] || Infinity;
        const seatsMatch = prompt.match(/(\d+)\s*(?:座|people|persons)/i);
        const seats = seatsMatch ? Number(seatsMatch[1]) : null;
        const query = { dailyRate: { $lte: Number(maxPrice) } };
        if (seats) query.seats = { $gte: Number(seats) };

        // 查询前5条结果
        const cars = await client.db('carRental').collection('cars')
            .find(query)
            .project({ _id: 0, brand: 1, model: 1, dailyRate: 1, seats: 1, type: 1, carID: 1, description: 1 })
            .toArray();

        // 构建上下文
        let context = 'optional vehicles:\n';
        cars.forEach(c => {
            context += `• ${c.brand} ${c.model}：$${c.dailyRate}/day，${c.seats}座，类型:${c.type} 描述:${c.description}\n`;
        });
        context += `\nuserneed：${prompt}\n Please recommend the 5 most suitable vehicles based on the above information. 
First, provide a short recommendation explanation in text.
Then, output ONLY the recommended vehicles as a JSON array with fields: brand, model, dailyRate, seats, type, carID.
Example: 
Reason: Based on the user's requirements, the following five vehicle models are recommended for their excellent value, ample seating, and suitable pricing. 
[
  { "brand": "Toyota", "model": "Corolla", "dailyRate": 30, "seats": 5, "type": "sedan", "carID": 101 },
  ...
]`;
        // 调用 Perplexity API
        const apiRes = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer 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`
            },
            body: JSON.stringify({
                model: 'sonar',
                messages: [
                    { role: 'user', content: context }
                ]
            })
        });
        if (!apiRes.ok) {
            const text = await apiRes.text();
            console.error('Perplexity API error:', text);
            return res.status(apiRes.status).json({ error: `Perplexity 返回 ${apiRes.status}` });
        }
        const ct = apiRes.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
            const text = await apiRes.text();
            console.error('非 JSON 响应:', text);
            return res.status(502).json({ error: '上游服务非 JSON 响应' });
        }

        const json = await apiRes.json();
        const answer = json.choices?.[0]?.message?.content || '';

        // 解析推荐文本和 JSON 列表
        // 假设 AI 格式为: Reason: ...<newline>[array]
        let explain = '';
        let carsArr = [];
        const match = answer.match(/Reason:\s*([^\[]+)\s*(\[[\s\S]+\])/i);
        if (match) {
            explain = match[1].trim();
            try {
                carsArr = JSON.parse(match[2]);
            } catch (e) {
                console.error('车辆JSON解析失败', e);
            }
        } else {
            // 回退策略：只拿整个文本和空数组
            explain = answer.trim();
        }

        res.json({ text: explain, cars: carsArr });

    } catch (err) {
        res.status(500).json({ error: 'AI 服务出错' });
    } finally {
        await client.close();
    }
});


export default router;