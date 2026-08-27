function trierMembres(membres, organisation) {
  if (organisation.type === 'ecole') {
    return [...membres].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }

  const hierarchie = organisation.roles_hierarchie || [];

  if (hierarchie.length === 0) {
    return [...membres].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }

  return [...membres].sort((a, b) => {
    const indexA = hierarchie.indexOf(a.role);
    const indexB = hierarchie.indexOf(b.role);
    const rangA = indexA === -1 ? hierarchie.length : indexA;
    const rangB = indexB === -1 ? hierarchie.length : indexB;

    if (rangA !== rangB) return rangA - rangB;
    return a.nom.localeCompare(b.nom, 'fr');
  });
}

module.exports = trierMembres;