(() => {
  'use strict';
  const config = window.OPEN_CONFIG;
  const $ = id => document.getElementById(id);
  const selection = new Set();
  const drafts = new Map();
  const form = $('registration-form');
  const menu = $('menu');
  const dialog = $('review-dialog');
  const requiredIndicators = new Map();
  function isFieldComplete(field) {
    if (field.disabled || !field.required) return true;
    if (field.tagName.toLowerCase() === 'select') return Boolean(field.value);
    const value = field.value.trim().replace(/\s+/g, ' ');
    if (field.id === 'phone') return /^(?:55)?[1-9][0-9][0-9]{8,9}$/.test(value.replace(/\D/g, ''));
    if (value.length < 2) return false;
    const partnerId = field.id.endsWith('-one') ? field.id.replace(/-one$/, '-two') : field.id.endsWith('-two') ? field.id.replace(/-two$/, '-one') : null;
    const partner = partnerId && $(partnerId);
    return !partner || partner.disabled || value.toLocaleLowerCase('pt-BR') !== partner.value.trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
  }
  function refreshRequiredIndicators() {
    for (const {field, marker} of requiredIndicators.values()) marker.hidden = isFieldComplete(field);
    $('categories-required').hidden = selection.size > 0;
  }
  function bindRequired(field, marker) {
    field.setAttribute('aria-required', String(field.required));
    requiredIndicators.set(field.id, {field, marker});
    field.addEventListener('input', refreshRequiredIndicators);
    field.addEventListener('change', refreshRequiredIndicators);
    marker.hidden = isFieldComplete(field);
  }
  function addRequiredIndicator(label, field) {
    const marker = document.createElement('span');
    marker.className = 'required-mark'; marker.textContent = '*'; marker.setAttribute('aria-hidden', 'true');
    label.append(marker); bindRequired(field, marker);
  }
  bindRequired($('responsible'), $('responsible-required'));
  bindRequired($('phone'), $('phone-required'));
  $('menu-toggle').addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    $('menu-toggle').setAttribute('aria-expanded', String(open));
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    menu.classList.remove('open');
    $('menu-toggle').setAttribute('aria-expanded', 'false');
  }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      menu.classList.remove('open');
      $('menu-toggle').setAttribute('aria-expanded','false');
    }
  });
  $('maps-link').href = config.maps;
  $('waze-link').href = `https://waze.com/ul?ll=${config.latitude},${config.longitude}&navigate=yes`;
  $('map').src = `https://maps.google.com/maps?q=${config.latitude},${config.longitude}&z=17&output=embed`;

  function clearError() {
    $('form-error').hidden = true;
    form.querySelectorAll('[aria-invalid="true"]').forEach(el => el.removeAttribute('aria-invalid'));
  }
  function showError(message, field) {
    const error = $('form-error');
    error.textContent = message;
    error.hidden = false;
    if (field) { field.setAttribute('aria-invalid','true'); field.focus(); }
    else error.focus();
  }
  function selectedCategories() { return config.categories.filter(c => selection.has(c.id)); }
  function updateCount() {
    const n = selection.size;
    $('category-count').textContent = n ? `${n} categoria${n === 1 ? '' : 's'} selecionada${n === 1 ? '' : 's'}` : 'Nenhuma categoria selecionada';
    $('teams-fieldset').hidden = n === 0;
    refreshRequiredIndicators();
  }
  function makeInput(id, title, value, required) {
    const label = document.createElement('label');
    label.textContent = title.replace(/\s*\*$/, '');
    const input = document.createElement('input');
    input.id = id; input.name = id; input.type = 'text'; input.maxLength = 100;
    input.autocomplete = 'off'; input.required = required; input.value = value;
    input.placeholder = 'Nome completo do atleta';
    addRequiredIndicator(label, input);
    label.append(input);
    return {label, input};
  }
  function isMixed(categoryId) { return ['misto-aprendiz', 'misto-aberto'].includes(categoryId); }
  function uniformRules(categoryId, athlete) {
    if (categoryId === 'kids' && athlete === 'one') return config.uniforms.child;
    if (categoryId === 'feminino') return config.uniforms.female;
    if (isMixed(categoryId) && athlete === 'two') return config.uniforms.mixedFemale;
    return config.uniforms.adult;
  }
  function athleteLabel(categoryId, athlete) {
    if (categoryId === 'kids') return athlete === 'one' ? 'Criança (até 14 anos)' : 'Atleta adulto';
    if (isMixed(categoryId)) return athlete === 'one' ? 'Atleta homem' : 'Atleta mulher';
    if (categoryId === 'feminino') return athlete === 'one' ? 'Atleta 1' : 'Atleta 2';
    return athlete === 'one' ? 'Atleta 1' : 'Atleta 2';
  }
  function makeUniform(categoryId, athlete, state) {
    if (!config.uniformsEnabled) { const group = document.createElement('div'); group.hidden = true; return {group, fields:{}, setPending() {}}; }
    const rules = uniformRules(categoryId, athlete);
    const fixedModel = rules.models.length === 1;
    if (fixedModel) state.model = rules.models[0][0];
    const group = document.createElement('div');
    group.className = 'uniform-fields';
    group.id = `${categoryId}-${athlete}-uniform`;
    group.hidden = false;
    const title = document.createElement('p'); title.className = 'uniform-title'; title.textContent = categoryId === 'feminino' ? `Uniforme da atleta ${athlete === 'one' ? '1' : '2'}` : categoryId === 'kids' && athlete === 'one' ? 'Uniforme do atleta infantil' : 'Uniforme deste atleta';
    group.append(title);
    const fields = {};
    for (const [key, labelText, options] of [
      ['short', 'Short *', rules.sizes.map(size => [size, size])],
      ['model', 'Modelo da blusa *', rules.models],
      ['shirt', rules.models[0][0] === 'baby-look' ? 'Blusa Baby Look *' : 'Tamanho da blusa *', rules.sizes.map(size => [size, size])]
    ]) {
      const label = document.createElement('label'); label.textContent = labelText.replace(/\s*\*$/, '');
      const select = document.createElement('select'); select.id = `${categoryId}-${athlete}-${key}`; select.name = select.id; select.required = !(key === 'model' && fixedModel);
      const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Selecione'; select.append(empty);
      for (const [value, text] of options) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); }
      select.value = state[key];
      select.addEventListener('change', () => { state[key] = select.value; clearError(); });
      addRequiredIndicator(label, select);
      label.append(select); if (key === 'model' && fixedModel) label.hidden = true; group.append(label); fields[key] = select;
    }
    return {group, fields, setPending(pending) {
      group.hidden = pending;
      Object.entries(fields).forEach(([key, field]) => { field.disabled = pending; field.required = !pending && !(key === 'model' && fixedModel); field.setAttribute('aria-required', String(field.required)); field.removeAttribute('aria-invalid'); });
    }};
  }
  function addTeam(category) {
    const state = drafts.get(category.id) || {one:'', two:'', pending:false, uniformOne:{short:'', model:'', shirt:''}, uniformTwo:{short:'', model:'', shirt:''}};
    drafts.set(category.id, state);
    const card = document.createElement('section');
    card.className = category.id === 'feminino' ? 'team-card female-team' : 'team-card'; card.id = `team-${category.id}`;
    card.setAttribute('aria-label', `Atletas: ${category.name}`);
    const heading = document.createElement('div'); heading.className = 'team-heading';
    const title = document.createElement('h4'); title.textContent = category.name;
    const remove = document.createElement('button'); remove.type = 'button';
    remove.className = 'remove-category'; remove.textContent = 'Remover';
    remove.setAttribute('aria-label', `Remover categoria ${category.name}`);
    remove.addEventListener('click', () => {
      const option = $(`cat-${category.id}`);
      option.checked = false; toggleCategory(category, false); option.focus();
    });
    heading.append(title,remove);
    const date = document.createElement('p'); date.className = 'field-help'; date.textContent = category.schedule + (category.id === 'kids' ? ' • Uma criança de até 14 anos e um adulto' : category.id === 'misto-aprendiz' ? ' • Mulher aprendiz e homem aprendiz ou iniciante' : isMixed(category.id) ? ' • Um homem e uma mulher' : '');
    const row = document.createElement('div'); row.className = 'input-grid';
    const one = makeInput(`${category.id}-one`, `${athleteLabel(category.id, 'one')} *`, state.one, true);
    const two = makeInput(`${category.id}-two`, `${athleteLabel(category.id, 'two')} *`, state.two, !state.pending);
    const uniformOne = makeUniform(category.id, 'one', state.uniformOne);
    const uniformTwo = makeUniform(category.id, 'two', state.uniformTwo);
    const athleteOne = document.createElement('div'); athleteOne.className = 'athlete-block'; athleteOne.append(one.label, uniformOne.group);
    const athleteTwo = document.createElement('div'); athleteTwo.className = 'athlete-block'; athleteTwo.append(two.label, uniformTwo.group);
    const choice = document.createElement('label'); choice.className = 'partner-choice';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
    checkbox.id = `${category.id}-pending`; checkbox.checked = state.pending;
    const text = document.createElement('span'); text.textContent = 'Dupla a escolher (ainda não tenho parceiro)';
    function updatePartner() {
      two.input.disabled = state.pending; two.input.required = !state.pending; two.input.setAttribute('aria-required', String(!state.pending));
      uniformTwo.setPending(state.pending);
      two.input.placeholder = state.pending ? 'Dupla a escolher' : 'Nome completo do atleta';
      two.input.value = state.pending ? '' : state.two;
      two.label.firstChild.textContent = `${athleteLabel(category.id, 'two')}${state.pending ? ': dupla a escolher' : ''}`;
      two.input.removeAttribute('aria-invalid');
      refreshRequiredIndicators();
    }
    checkbox.addEventListener('change', () => { state.pending = checkbox.checked; updatePartner(); clearError(); });
    one.input.addEventListener('input', () => { state.one = one.input.value; clearError(); });
    two.input.addEventListener('input', () => { state.two = two.input.value; clearError(); });
    uniformOne.setPending(false);
    updatePartner();
    choice.append(checkbox,text); row.append(athleteOne,athleteTwo); card.append(heading,date,row,choice);
    // Keep chosen categories in the same order as the quick selection, without rebuilding inputs.
    const following = config.categories.slice(config.categories.indexOf(category) + 1).find(c => selection.has(c.id));
    $('teams').insertBefore(card, following ? $(`team-${following.id}`) : null);
  }
  function toggleCategory(category, checked) {
    clearError();
    if (checked) { selection.add(category.id); addTeam(category); }
    else { selection.delete(category.id); $(`team-${category.id}`)?.remove(); }
    updateCount();
  }
  config.categories.forEach(category => {
    const label = document.createElement('label'); label.className = 'category-option';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
    checkbox.id = `cat-${category.id}`; checkbox.name = 'categories'; checkbox.value = category.id;
    const name = document.createElement('span'); name.textContent = category.name;
    checkbox.addEventListener('change', () => toggleCategory(category,checkbox.checked));
    label.append(checkbox,name); $('category-options').append(label);
  });
  function clean(value) { return value.trim().replace(/\s+/g,' '); }
  function validate() {
    clearError();
    if (!selection.size) { showError('Selecione pelo menos uma categoria.', $('cat-kids')); return false; }
    for (const category of selectedCategories()) {
      const state = drafts.get(category.id);
      if (clean(state.one).length < 2) { showError(`Informe o nome do Atleta 1 em ${category.name}.`, $(`${category.id}-one`)); return false; }
      if (!state.pending && clean(state.two).length < 2) { showError(`Informe o Atleta 2 em ${category.name} ou marque “Dupla a escolher”.`, $(`${category.id}-two`)); return false; }
      if (!state.pending && clean(state.one).toLocaleLowerCase('pt-BR') === clean(state.two).toLocaleLowerCase('pt-BR')) { showError(`Os dois atletas de ${category.name} precisam ser pessoas diferentes.`, $(`${category.id}-two`)); return false; }
      for (const [athlete, name, uniform] of (config.uniformsEnabled ? [['one', state.one, state.uniformOne], ...(state.pending ? [] : [['two', state.two, state.uniformTwo]])] : [])) {
        for (const [key, description] of [['short', 'o tamanho do short'], ['model', 'o modelo da blusa'], ['shirt', 'o tamanho da blusa']]) {
          const rules = uniformRules(category.id, athlete);
          const valid = key === 'model' ? rules.models.some(([value]) => value === uniform[key]) : rules.sizes.includes(uniform[key]);
          if (!valid) { showError(`Selecione ${description} de ${clean(name)} em ${category.name}.`, $(`${category.id}-${athlete}-${key}`)); return false; }
        }
      }
    }
    if (clean($('responsible').value).length < 2) { showError('Informe o nome do responsável pela inscrição.', $('responsible')); return false; }
    const digits = $('phone').value.replace(/\D/g,'');
    if (!/^(?:55)?[1-9][0-9][0-9]{8,9}$/.test(digits)) { showError('Informe um telefone válido com DDD, por exemplo (74) 99999-9999.', $('phone')); return false; }
    return true;
  }
  function buildMessage() {
    const lines = ['*SOLICITAÇÃO DE INSCRIÇÃO*', '*1º Open da Arena P.A. 2026*', '11 a 13 de dezembro • Arena P.A. • Várzea do Poço – BA', '', `*Responsável:* ${clean($('responsible').value)}`, `*WhatsApp de contato:* ${clean($('phone').value)}`, '', '*CATEGORIAS E ATLETAS*'];
    for (const category of selectedCategories()) {
      const state = drafts.get(category.id);
      lines.push('', `*Categoria:* ${category.name}`, `*Programação:* ${category.schedule}`, `${clean(state.one)}/${state.pending ? 'Dupla' : clean(state.two)}`);
      const uniformLine = (name, uniform) => `${clean(name)}: Short ${uniform.short} | Blusa ${uniform.shirt}${uniform.model === 'baby-look' ? ' (Baby Look)' : ' (Tradicional)'}`;
      if (config.uniformsEnabled) lines.push(uniformLine(state.one, state.uniformOne));
      if (config.uniformsEnabled) lines.push(state.pending ? 'Dupla: uniforme a definir' : uniformLine(state.two, state.uniformTwo));
    }
    lines.push('', 'Gostaria de confirmar a disponibilidade e receber as orientações de pagamento.');
    if ($('notes').value.trim()) lines.push('', `*Observações:* ${$('notes').value.trim()}`);
    return lines.join('\n');
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate()) return;
    const message = buildMessage();
    $('review-content').textContent = message;
    const hasContact = /^55[1-9][0-9]{9,10}$/.test(config.whatsapp);
    $('send-whatsapp').hidden = !hasContact;
    if (hasContact) $('send-whatsapp').href = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open','');
  });
  document.querySelectorAll('.questions details').forEach(item => item.addEventListener('toggle', () => { if(item.open) document.querySelectorAll('.questions details').forEach(other => { if(other !== item) other.open = false; }); }));
  function closeReview() { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); }
  $('close-review').addEventListener('click', closeReview);
  $('edit-review').addEventListener('click', closeReview);
  dialog.addEventListener('click', e => { if (e.target === dialog) { const box = dialog.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) closeReview(); } });
  refreshRequiredIndicators();
  // No automatic sending, storage, analytics, or payment. The visitor confirms in WhatsApp.
})();

(() => {
 const rail = document.getElementById('photo-rail');
 const button = document.getElementById('gallery-toggle');
 if (!rail || !button) return;
 // Embaralha sem duplicar fotos e preserva os elementos da galeria.
 const photos = Array.from(rail.children);
 for (let i = photos.length - 1; i > 0; i--) {
   const j = Math.floor(Math.random() * (i + 1));
   [photos[i], photos[j]] = [photos[j], photos[i]];
 }
 rail.append(...photos);

 const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
 let playing = !reduce.matches, hovered = false, focused = false, visible = false, direction = 1, previous = 0, resumeAt = 0, dragging = false, origin = 0, startScroll = 0;
 const updateButton = () => { button.textContent = playing ? 'Pausar movimento' : 'Retomar movimento'; button.setAttribute('aria-pressed', String(playing)); };
 updateButton();
 button.addEventListener('click', () => { playing = !playing; updateButton(); });
 rail.addEventListener('mouseenter', () => {hovered = true;}); rail.addEventListener('mouseleave', () => {hovered = false;});
 rail.addEventListener('focusin', () => {focused = true;}); rail.addEventListener('focusout', () => {focused = false;});
 rail.addEventListener('wheel', () => {resumeAt = performance.now() + 3500;}, {passive:true});
 rail.addEventListener('touchstart', () => {resumeAt = Infinity;}, {passive:true}); rail.addEventListener('touchend', () => {resumeAt = performance.now() + 3500;}, {passive:true}); rail.addEventListener('touchcancel', () => {resumeAt = performance.now() + 3500;}, {passive:true});
 rail.addEventListener('pointerdown', e => { if(e.pointerType !== 'mouse' || e.button !== 0) return; dragging = true; origin = e.clientX; startScroll = rail.scrollLeft; rail.setPointerCapture(e.pointerId); e.preventDefault(); });
 rail.addEventListener('pointermove', e => {if(dragging) rail.scrollLeft = startScroll - (e.clientX - origin);});
 const stopDrag = () => {dragging = false; resumeAt = performance.now() + 3500;}; rail.addEventListener('pointerup',stopDrag);rail.addEventListener('pointercancel',stopDrag);
 if ('IntersectionObserver' in window) new IntersectionObserver(entries => {visible = entries[0].isIntersecting;}, {threshold:0.05}).observe(rail); else visible = true;
 const frame = now => {const dt = Math.min(now - previous,64); previous = now; if(playing && visible && !document.hidden && !hovered && !focused && !dragging && now > resumeAt) { const max = rail.scrollWidth - rail.clientWidth; if(max > 0){rail.scrollLeft += direction * dt * .035; if(rail.scrollLeft >= max - 1) direction = -1; else if(rail.scrollLeft <= 0) direction = 1;} } requestAnimationFrame(frame);}; requestAnimationFrame(frame);
})();
