/**
 * Help Page
 */

class HelpPage {
  async init() {
    console.log('[Help] Initializing...');
    this.setupSearch();
    this.setupAccordions();
    console.log('[Help] Ready');
  }

  setupSearch() {
    const searchInput = document.getElementById('help-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterContent(e.target.value);
      });
    }
  }

  setupAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const parent = header.parentElement;
        parent.classList.toggle('active');
      });
    });
  }

  filterContent(query) {
    const sections = document.querySelectorAll('.help-section');
    const lowerQuery = query.toLowerCase();

    sections.forEach(section => {
      const text = section.textContent.toLowerCase();
      section.style.display = text.includes(lowerQuery) ? 'block' : 'none';
    });
  }
}

export default HelpPage;
