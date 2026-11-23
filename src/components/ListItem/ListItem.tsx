import './ListItem.css';

interface ListItemProps {
  name: string;
  sub?: string;
  grams: number;
  kcal: number;
  onClick?: () => void;
}

export function ListItem({ name, sub, grams, kcal, onClick }: ListItemProps) {
  return (
    <button type="button" className="list-item" onClick={onClick}>
      <span className="list-item__dot" aria-hidden="true" />
      <span className="list-item__main">
        <span className="list-item__name">{name}</span>
        {sub ? <span className="list-item__sub">{sub}</span> : null}
      </span>
      <span className="list-item__nums">
        <span className="list-item__grams">{Math.round(grams)} g</span>
        <span className="list-item__kcal">{kcal} kcal</span>
      </span>
    </button>
  );
}
