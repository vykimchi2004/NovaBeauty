import React from 'react';

export default function CategoryPage({ title, description }) {
  return (
    <section>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </section>
  );
}
