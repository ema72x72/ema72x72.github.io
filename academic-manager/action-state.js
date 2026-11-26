/* Shared action semantics for the Home and project detail views.
   Missing or unknown status is uncertainty, never proof of outstanding work. */
(function () {
  'use strict';
  const states = {
    open: {group:'active', label:'To do', symbol:'○'},
    in_progress: {group:'active', label:'In progress', symbol:'◐'},
    blocked: {group:'active', label:'Blocked', symbol:'!'},
    unverified: {group:'unverified', label:'Status to verify', symbol:'?'},
    completed: {group:'completed', label:'Completed', symbol:'✓'},
    superseded: {group:'superseded', label:'Superseded', symbol:'–'}
  };
  const state = action => states[action?.status] || states.unverified;
  const group = (actions, name) => (actions || []).filter(a => state(a).group === name);
  const current = actions => (actions || []).filter(a => ['active','unverified'].includes(state(a).group));
  window.AcademicActions = {state, group, current};
})();
