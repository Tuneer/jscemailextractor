# 🤝 Contributing to Email Extractor

Thank you for your interest in contributing to the Email Extractor project! We welcome contributions from the community and appreciate your efforts to improve the project.

## 📋 Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Pull Request Process](#pull-request-process)
5. [Style Guides](#style-guides)
6. [Reporting Bugs](#reporting-bugs)
7. [Suggesting Enhancements](#suggesting-enhancements)
8. [Community](#community)

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ (LTS recommended)
- npm v8+
- Git
- Gmail account with app password enabled

### Fork and Clone
1. Fork the repository on GitHub
2. Clone your fork locally:
```bash
git clone https://github.com/YOUR_USERNAME/jscemailextractor.git
cd jscemailextractor
```

### Set Up Your Development Environment
1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

3. Set up environment variables:
```bash
cd ../backend
cp .env.example .env
# Edit .env with your credentials
```

### Verify Your Setup
1. Start the backend server:
```bash
cd backend
npm start
```

2. In a new terminal, start the frontend:
```bash
cd frontend
ng serve
```

3. Visit `http://localhost:4200` to ensure the application loads correctly.

---

## 🔄 Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b bugfix/issue-description
```

### 2. Make Your Changes
- Follow the [Coding Standards](CODING_STANDARDS.md)
- Write clear, well-documented code
- Add tests for new functionality
- Ensure all tests pass

### 3. Commit Your Changes
- Follow the [commit message format](CODING_STANDARDS.md#git-commit-standards)
- Write meaningful commit messages
- Keep commits focused and atomic

```bash
git add .
git commit -m "feat(component): add new email search functionality"
```

### 4. Push to Your Fork
```bash
git push origin feature/your-feature-name
```

---

## 📤 Pull Request Process

### 1. Before Submitting
- Ensure your branch is up to date with the main branch:
```bash
git checkout main
git pull origin main
git checkout your-branch
git merge main
```

- Run all tests and ensure they pass
- Verify your changes work as expected
- Update documentation in the `docs/` directory if necessary

### 2. Create the Pull Request
1. Go to the original repository on GitHub
2. Click "Compare & pull request"
3. Fill out the pull request template:
   - **Title**: Brief, descriptive title
   - **Description**: Detailed explanation of changes
   - **Related Issues**: Link any related issues
   - **Testing Instructions**: How to test the changes

### 3. Pull Request Guidelines
- Keep pull requests focused on a single feature or bug fix
- Include tests for new functionality
- Update documentation as needed
- Reference related issues in the description
- Be responsive to feedback during the review process

### 4. Code Review Process
- At least one maintainer must approve the PR
- Address all review comments
- Make requested changes promptly
- Be open to suggestions and feedback

---

## 🎨 Style Guides

### Code Style
- Follow the [Coding Standards](docs/CODING_STANDARDS.md)
- Use consistent naming conventions
- Write clean, readable code
- Add meaningful comments for complex logic

### Documentation Style
- Update README.md if adding new features
- Add inline documentation for complex functions
- Update API documentation as needed
- Use clear, concise language

### Commit Message Style
- Use imperative mood ("Add feature" not "Added feature")
- Capitalize first letter
- Keep messages under 72 characters
- Reference issues when applicable

---

## 🐛 Reporting Bugs

### Before Reporting a Bug
- Search the issue tracker to see if the bug has already been reported
- Check if the issue has been fixed in the latest version
- Ensure you're using the supported versions of dependencies

### How to Submit a Good Bug Report
Bugs are tracked as [GitHub issues](https://github.com/jscemailextractor/jscemailextractor/issues). When reporting a bug, please include:

1. **Summary**: Clear and descriptive title
2. **Steps to Reproduce**: Specific steps to reproduce the issue
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: Operating system, Node.js version, browser version
6. **Screenshots**: If applicable
7. **Logs**: Error messages or console logs

Example:
```
Title: Email search fails when query contains special characters

Steps to Reproduce:
1. Go to Email Reader page
2. Enter query with special characters like "test@domain.com"
3. Click "Search Emails"
4. Observe the error

Expected: Emails matching the query should be returned
Actual: Error message "Invalid query format" appears

Environment: Windows 10, Node.js 18.17.0, Chrome 115.0.5790.110
```

---

## ✨ Suggesting Enhancements

### Before Suggesting an Enhancement
- Check if the enhancement already exists in the roadmap
- Look for similar suggestions in the issue tracker
- Consider if your idea fits the project scope

### How to Submit a Good Enhancement Suggestion
Enhancement suggestions are tracked as [GitHub issues](https://github.com/jscemailextractor/jscemailextractor/issues). When suggesting an enhancement, please include:

1. **Summary**: Clear and descriptive title
2. **Motivation**: Why this enhancement is needed
3. **Detailed Description**: How the enhancement should work
4. **Alternatives**: Any alternative solutions you've considered
5. **Use Cases**: Real-world scenarios where this enhancement would be useful

Example:
```
Title: Add support for Outlook email accounts

Motivation: Currently only Gmail is supported, but many organizations use Outlook

Detailed Description: 
- Add OAuth2 integration for Outlook
- Support IMAP for Outlook accounts
- Maintain same UI/UX as Gmail integration
- Handle Outlook-specific quirks and limitations

Use Cases:
- Corporate environments using Office 365
- Organizations with custom Exchange servers
- Users with Outlook.com accounts
```

---

## 🧪 Testing Guidelines

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Adding Tests
- Write unit tests for new functionality
- Include integration tests for API endpoints
- Test edge cases and error conditions
- Aim for high code coverage (>80%)

### Test Structure
- Organize tests logically
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

---

## 📁 Repository Structure

```
jscemailextractor/
├── backend/                 # Node.js API server
│   ├── middleware/          # Authentication and other middleware
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic and external integrations
│   └── server.js            # Entry point
├── frontend/                # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/  # UI components
│   │   │   ├── services/    # Business logic services
│   │   │   ├── models/      # TypeScript interfaces/models
│   │   │   └── guards/      # Route guards
│   │   └── styles.css       # Global styles
├── docs/                    # Comprehensive documentation files
├── .github/                 # GitHub-specific files
└── various config files
```

---

## 🛠️ Development Tools

### Recommended IDE
- Visual Studio Code with extensions:
  - Angular Language Service
  - TypeScript
  - Prettier
  - ESLint
  - GitLens

### Linting and Formatting
- ESLint for JavaScript/TypeScript linting
- Prettier for code formatting
- Pre-commit hooks to enforce standards

### Debugging
- Use browser dev tools for frontend debugging
- Use Node.js inspector for backend debugging
- Add meaningful log statements for troubleshooting

---

## 📞 Getting Help

### When You Get Stuck
1. Check the [documentation](DEVELOPER_GUIDE.md)
2. Search existing issues
3. Ask questions in pull requests or issues
4. Contact the maintainers

### Community Channels
- GitHub Issues: For bugs, enhancements, and questions
- Email: mahatpuretuneer@gmail.com (maintainer contact)

---

## 🙏 Thank You

Thank you for taking the time to contribute to Email Extractor! Your contributions help make this project better for everyone.

Remember that all contributions are valuable, whether it's:
- Reporting bugs
- Suggesting enhancements
- Writing documentation
- Submitting code
- Helping other users

Happy coding! 🎉