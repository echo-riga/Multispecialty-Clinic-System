// Diagnostic script to find which element has the scrollbar
(function debugAdminScrollbar() {
  function findScrollableElements() {
    const scrollable = [];
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(el => {
      const style = window.getComputedStyle(el);
      const overflow = style.overflow + style.overflowY + style.overflowX;
      const hasScrollbar = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
      
      if (hasScrollbar && (overflow.includes('scroll') || overflow.includes('auto'))) {
        scrollable.push({
          element: el,
          tag: el.tagName,
          id: el.id,
          classes: el.className,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth
        });
      }
    });
    
    console.log('Scrollable elements found:', scrollable);
    return scrollable;
  }
  
  // Run after page loads
  setTimeout(() => {
    const user = JSON.parse(localStorage.getItem('authUser') || '{}');
    console.log('Current user:', user);
    console.log('Is admin?', user.role === 'admin');
    console.log('Body classes:', document.body.className);
    console.log('HTML classes:', document.documentElement.className);
    
    const scrollable = findScrollableElements();
    if (scrollable.length > 0) {
      console.warn('Found scrollable elements - these may have visible scrollbars:');
      scrollable.forEach((item, i) => {
        console.log(`${i + 1}. ${item.tag}${item.id ? '#' + item.id : ''}${item.classes ? '.' + item.classes.split(' ').join('.') : ''}`);
        console.log(`   Scroll: ${item.scrollHeight}x${item.scrollWidth}, Client: ${item.clientHeight}x${item.clientWidth}`);
      });
    }
  }, 1000);
})();


