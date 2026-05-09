import { Users, AlertTriangle, Activity, TrendingUp, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const data = [
  { name: '04/14', count: 420, density: 0.45 },
  { name: '04/15', count: 380, density: 0.41 },
  { name: '04/16', count: 510, density: 0.55 },
  { name: '04/17', count: 460, density: 0.48 },
  { name: '04/18', count: 680, density: 0.72 },
  { name: '04/19', count: 720, density: 0.78 },
  { name: '04/20', count: 590, density: 0.61 },
];

const metrics = [
  { label: '累计计数 (Count)', value: '14,282', icon: Activity, trend: '+12.5%', color: 'text-accent-blue' },
  { label: '平均密度 (Density)', value: '0.58/m²', icon: TrendingUp, trend: '+5.2%', color: 'text-accent-green' },
  { label: '高风险警报', value: '24', icon: AlertTriangle, trend: '+12%', color: 'text-accent-red' },
  { label: '引擎活跃节点', value: '12', icon: Clock, trend: '稳定', color: 'text-white' },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-6 group hover:border-white/20 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={metric.color}>
                <metric.icon size={20} />
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                metric.trend.includes('+') ? (metric.color === 'text-accent-red' ? "bg-accent-red/20 text-accent-red" : "bg-accent-green/20 text-accent-green") : 
                metric.trend.includes('-') ? "bg-accent-blue/20 text-accent-blue" : "bg-white/5 text-[#8B949E]"
              )}>
                {metric.trend}
              </span>
            </div>
            <h3 className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest mb-1">{metric.label}</h3>
            <p className="text-2xl font-light tracking-tight text-white">{metric.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Stats Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight uppercase">密集度与人数协同趋势</h3>
              <p className="text-[10px] text-[#8B949E] uppercase tracking-widest">Density vs Count Synergy Analysis</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-[10px] font-bold uppercase rounded-md bg-accent-blue/20 text-accent-blue border border-accent-blue/30 transition-colors">7D</button>
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#58A6FF" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#58A6FF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDensity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3FB950" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3FB950" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#8B949E', fontSize: 10, fontWeight: 500 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#8B949E', fontSize: 10, fontWeight: 500 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(13, 17, 23, 0.95)', 
                    border: '1px solid rgba(48, 54, 61, 1)', 
                    borderRadius: '12px',
                    fontSize: '10px',
                    backdropFilter: 'blur(10px)'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '10px', textTransform: 'uppercase' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#58A6FF" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  name="Count"
                />
                <Area 
                  type="monotone" 
                  dataKey="density" 
                  stroke="#3FB950" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorDensity)" 
                  name="Density"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 flex flex-col h-[400px]">
          <h3 className="text-lg font-bold text-white mb-6 tracking-tight">高风险区域警报</h3>
          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {[
              { area: '南门出口', time: '10:42', count: 342, status: 'Overcrowded' },
              { area: '2号展厅', time: '10:38', count: 215, status: 'High' },
              { area: '东侧广场', time: '10:15', count: 189, status: 'High' },
              { area: '美食街B区', time: '09:55', count: 302, status: 'Overcrowded' },
              { area: '主舞台', time: '09:42', count: 288, status: 'High' },
            ].map((alert, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{alert.area}</span>
                    <span className="text-[10px] text-[#8B949E]">{alert.time}</span>
                  </div>
                  <div className="text-[10px] text-[#8B949E] uppercase tracking-wider">
                    计人数: <span className="text-white font-mono">{alert.count}</span>
                  </div>
                </div>
                <div className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border",
                  alert.status === 'Overcrowded' ? "bg-accent-red/20 text-accent-red border-accent-red/30" : "bg-accent-orange/20 text-accent-orange border-accent-orange/30"
                )}>
                  {alert.status === 'Overcrowded' ? '拥挤' : '高危'}
                </div>
              </div>
            ))}
          </div>
          <button className="mt-auto w-full py-2 text-[10px] font-bold uppercase text-accent-blue tracking-widest hover:underline transition-all">全站报告</button>
        </div>
      </div>
    </div>
  );
}
