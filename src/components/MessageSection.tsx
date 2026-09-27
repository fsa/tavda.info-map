import { formatMessageDate, type MapMessage } from "../lib/messages";

interface Props {
  /** Свои сообщения, уже загруженные с сервера */
  messages: MapMessage[];
  /** Какое сообщение сейчас выбрано */
  selectedId: string | null;
  /** Клик по записи в списке */
  onSelect: (id: string) => void;
  /** Кнопка «оставить сообщение» */
  onAdd: () => void;
}

/**
 * Секция «Мои сообщения» в боковом меню.
 *
 * Это не список всех записанных на карте (такого списка нет и не будет), а
 * только сообщения самого посетителя — они лежат у него в браузере.
 */
export default function MessageSection({ messages, selectedId, onSelect, onAdd }: Props) {
  return (
    <div className="messages-section">
      <div className="messages-header">
        <span className="messages-label">Мои сообщения</span>
        {messages.length > 0 && (
          <span className="messages-count">{messages.length}</span>
        )}
      </div>

      <button type="button" className="messages-add" onClick={onAdd}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
          <path
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 5v14M5 12h14"
          />
        </svg>
        <span>Оставить сообщение</span>
      </button>

      {messages.length === 0 ? (
        <p className="messages-empty">
          Здесь появятся сообщения, которые вы оставили на карте. Их видите
          только вы — по ссылке в этом браузере их не увидит никто.
        </p>
      ) : (
        <ul className="messages-list">
          {messages.map((message) => (
            <li key={message.id}>
              <button
                type="button"
                className={`messages-item${message.id === selectedId ? " messages-item-active" : ""}`}
                onClick={() => onSelect(message.id)}
                aria-pressed={message.id === selectedId}
              >
                <span className="messages-item-text">{message.text}</span>
                <span className="messages-item-date">
                  {formatMessageDate(message.created_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
