import { Globe, Cpu, Shield, Github } from "lucide-react";

function Row({ icon: Icon, label, value, testid }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-[#30363d] last:border-b-0" data-testid={testid}>
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-[#8b949e]" strokeWidth={1.5} />
        <span className="text-[#c9d1d9]">{label}</span>
      </div>
      <span className="font-mono text-sm text-[#8b949e]">{value}</span>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="max-w-3xl space-y-6" data-testid="page-settings">
      <div className="rc-reveal">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8b949e] mb-3">
          ▸ настройки
        </div>
        <h1 className="font-heading text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
          Настройки
        </h1>
        <p className="text-[#8b949e]">Конфигурация и информация за RealCheck.</p>
      </div>

      <section className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#30363d] font-mono text-[10px] uppercase tracking-[0.2em] text-[#8b949e]">
          ▸ Системна информация
        </div>
        <Row icon={Globe} label="Език на интерфейса" value="Български (bg)" testid="cfg-lang" />
        <Row icon={Cpu} label="AI модел" value="Gemini 3 Pro" testid="cfg-model" />
        <Row icon={Shield} label="Версия" value="1.0.0" testid="cfg-version" />
        <Row icon={Github} label="Тема" value="Dark · Terminal" testid="cfg-theme" />
      </section>

      <section className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
        <h3 className="font-heading text-lg font-semibold text-white mb-2">Как работи RealCheck?</h3>
        <p className="text-[#8b949e] text-sm leading-relaxed">
          RealCheck използва Gemini 3 Pro за извличане на твърдения от текст и оценява всяко
          твърдение като <span className="text-[#3fb950] font-medium">потвърдено</span>,{" "}
          <span className="text-[#d29922] font-medium">съмнително</span> или{" "}
          <span className="text-[#f85149] font-medium">непотвърдено</span>. Общият рейтинг
          на достоверност (0-100) и нивото на риск се изчисляват въз основа на разпределението
          на твърденията и категориите ефективност, безопасност, цена и доказателства.
        </p>
      </section>

      <section className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
        <h3 className="font-heading text-lg font-semibold text-white mb-3">Легенда на рисковете</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: "Нисък риск", range: "75-100", color: "#3fb950" },
            { label: "Среден риск", range: "50-74", color: "#d29922" },
            { label: "Висок риск", range: "0-49", color: "#f85149" },
          ].map((r) => (
            <div
              key={r.label}
              className="p-3 rounded border"
              style={{ borderColor: `${r.color}40`, background: `${r.color}10` }}
            >
              <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: r.color }}>
                {r.label}
              </div>
              <div className="font-mono text-xl font-bold mt-1" style={{ color: r.color }}>
                {r.range}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
