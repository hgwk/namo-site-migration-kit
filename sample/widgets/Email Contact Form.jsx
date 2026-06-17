import React, { useState } from 'react';

export default function ContactFormWidget() {

  // Easily configurable message format
  function getEmailBody(formData) {
    return `New contact form submission:
Name: ${formData.name}
Email: ${formData.email}
Company: ${formData.company || 'Not provided'}
Phone: ${formData.phone || 'Not provided'}
Subject: ${formData.subject || 'Not provided'}

Message:
${formData.message}
      `.trim();
  }

  // Configuration is loaded from Widget.constants (the "Constants" tab in the editor).
  // Edit values there instead of changing this file.
  const CONTACT_FORM_CONFIG = {
    title: Constants.title || "Contact Us",
    subtitle: Constants.subtitle || "Get in touch with our team. We'd love to hear from you.",
    labels: {
      name: Constants.labels?.name || "Full Name *",
      email: Constants.labels?.email || "Email Address *",
      company: Constants.labels?.company || "Company",
      phone: Constants.labels?.phone || "Phone Number",
      subject: Constants.labels?.subject || "Subject",
      message: Constants.labels?.message || "Message *",
    },
    placeholders: {
      name: Constants.placeholders?.name || "Enter your full name",
      email: Constants.placeholders?.email || "Enter your email address",
      company: Constants.placeholders?.company || "Enter your company name",
      phone: Constants.placeholders?.phone || "Enter your phone number",
      subject: Constants.placeholders?.subject || "What is this regarding?",
      message: Constants.placeholders?.message || "Tell us how we can help you...",
    },
    buttons: {
      submit: Constants.buttons?.submit || "Send Message",
      submitting: Constants.buttons?.submitting || "Sending Message...",
    },
    messages: {
      success: Constants.messages?.success || "Thank you for your message! We'll get back to you soon.",
      requiredFields: Constants.messages?.requiredFields || "Please fill in all required fields.",
      invalidEmail: Constants.messages?.invalidEmail || "Please enter a valid email address.",
      error: Constants.messages?.error || "Sorry, there was an error sending your message. Please try again.",
      errorBot: Constants.messages?.errorBot || "Suspected bot behavior.",
    },
    email: {
      defaultSubject: Constants.email?.defaultSubject || "New Contact Form Submission",
    },
  };


  const [formData, setFormData] = useState({ name: '', email: '', company: '', phone: '', subject: '', message: '', });
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [formStartTime, setFormStartTime] = useState(null); // Track when user starts typing

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNameBlur = () => {
    // Set start time when user finishes typing in the name field
    if (!formStartTime) {
      setFormStartTime(Date.now());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading)
      return;


    // Basic validation
    if (!formData.name || !formData.email || !formData.message) {
      setSubmitStatus({ type: 'error', message: CONTACT_FORM_CONFIG.messages.requiredFields });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setSubmitStatus({ type: 'error', message: CONTACT_FORM_CONFIG.messages.invalidEmail });
      return;
    }

    setIsLoading(true);
    setSubmitStatus(null);

    try {
      // Construct email content
      const subject = formData.subject || CONTACT_FORM_CONFIG.email.defaultSubject;
      const emailMessage = getEmailBody(formData)

      // Calculate editing duration for bot protection
      const durationMS = formStartTime ? Date.now() - formStartTime : undefined;
      await API.Site_SendEmailToAdmin(subject, emailMessage, durationMS);
      setSubmitStatus({ type: 'success', message: CONTACT_FORM_CONFIG.messages.success });

      // Reset form
      setFormData({ name: '', email: '', company: '', phone: '', subject: '', message: '' });
      setFormStartTime(null);
    } catch (error) {
      console.error('Contact form error:', error);
      if (error.message && error.message.includes('HTTP 403')) {
        // If 403 error , clear the name field
        setSubmitStatus({ type: 'error', message: CONTACT_FORM_CONFIG.messages.errorBot });
      } else if (error.message && error.message.includes('HTTP 400')) {
        setSubmitStatus({ type: 'error', message: error.message });
      } else {
        setSubmitStatus({ type: 'error', message: CONTACT_FORM_CONFIG.messages.error });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-xl shadow-sm">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {CONTACT_FORM_CONFIG.title}
        </h2>
        <p className="text-gray-600 text-center mb-8">
          {CONTACT_FORM_CONFIG.subtitle}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                {CONTACT_FORM_CONFIG.labels.name}
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                onBlur={handleNameBlur}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                placeholder={CONTACT_FORM_CONFIG.placeholders.name}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {CONTACT_FORM_CONFIG.labels.email}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                placeholder={CONTACT_FORM_CONFIG.placeholders.email}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                {CONTACT_FORM_CONFIG.labels.company}
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                placeholder={CONTACT_FORM_CONFIG.placeholders.company}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                {CONTACT_FORM_CONFIG.labels.phone}
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                placeholder={CONTACT_FORM_CONFIG.placeholders.phone}
              />
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              {CONTACT_FORM_CONFIG.labels.subject}
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
              placeholder={CONTACT_FORM_CONFIG.placeholders.subject}
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              {CONTACT_FORM_CONFIG.labels.message}
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-vertical"
              placeholder={CONTACT_FORM_CONFIG.placeholders.message}
              required
            />
          </div>


          {submitStatus && (
            <div className={`mb-6 p-4 rounded-lg ${submitStatus.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
              <div className="flex items-center gap-2">
                {submitStatus.type === 'success' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                <span>{submitStatus.message}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{CONTACT_FORM_CONFIG.buttons.submitting}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{CONTACT_FORM_CONFIG.buttons.submit}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}