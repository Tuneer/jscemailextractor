# 📋 Coding Standards - Email Extractor

## 🎯 Purpose
This document outlines the coding standards and best practices for the Email Extractor project to ensure consistency, maintainability, and collaboration among developers.

## 📖 Table of Contents
1. [General Principles](#general-principles)
2. [JavaScript/Node.js Standards](#javascriptnodejs-standards)
3. [TypeScript/Angular Standards](#typescriptangular-standards)
4. [File Naming Conventions](#file-naming-conventions)
5. [Code Structure](#code-structure)
6. [Documentation Standards](#documentation-standards)
7. [Testing Guidelines](#testing-guidelines)
8. [Git Commit Standards](#git-commit-standards)

---

## 🧭 General Principles

### 1. KISS (Keep It Simple, Stupid)
- Write code that is easy to understand and maintain
- Avoid unnecessary complexity
- Favor readability over cleverness

### 2. DRY (Don't Repeat Yourself)
- Create reusable functions and components
- Extract common logic into services/utilities
- Use constants for repeated values

### 3. SOLID Principles
- **Single Responsibility**: Each function/class should have one purpose
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Objects should be replaceable with their subtypes
- **Interface Segregation**: Many client-specific interfaces are better than one general-purpose interface
- **Dependency Inversion**: Depend on abstractions, not concretions

### 4. Consistency
- Follow the same patterns throughout the codebase
- Maintain uniform code style
- Use the same naming conventions

---

## 🟨 JavaScript/Node.js Standards

### Naming Conventions
- **Variables/Functions**: camelCase
  ```javascript
  const userEmail = 'user@example.com';
  function sendOTP(email) { ... }
  ```
- **Constants**: UPPER_SNAKE_CASE
  ```javascript
  const JWT_EXPIRATION_TIME = '24h';
  const MAX_ATTACHMENT_SIZE = 10485760;
  ```
- **Classes**: PascalCase
  ```javascript
  class GmailIMAPService { ... }
  ```

### Code Style
- Use 2 spaces for indentation
- Use single quotes for strings (except template literals)
- Always use semicolons
- Prefer const over let, let over var
- Use arrow functions for callbacks
- Use template literals over string concatenation

```javascript
// Good
const processEmail = async (emailId) => {
  const result = await emailService.process(emailId);
  return result;
};

// Avoid
var email = 'test@example.com';
function processEmail(emailId) {
  return emailService.process(emailId);
}
```

### Error Handling
- Always handle promise rejections
- Use try/catch blocks appropriately
- Log errors with context
- Return appropriate HTTP status codes

```javascript
try {
  const emails = await gmailService.searchEmails(options);
  res.json({
    success: true,
    emails: emails,
    count: emails.length
  });
} catch (error) {
  console.error('Error searching emails:', error);
  res.status(500).json({
    success: false,
    message: 'Failed to search emails',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}
```

### Async/Await vs Promises
- Use async/await over .then()/.catch() when possible
- Use promises when dealing with multiple concurrent operations

```javascript
// Good
const processMultipleEmails = async (emailIds) => {
  const results = await Promise.all(
    emailIds.map(id => processEmail(id))
  );
  return results;
};

// Avoid
const processMultipleEmails = (emailIds) => {
  return emailIds.map(id => 
    processEmail(id).then(result => result)
  );
};
```

---

## 🦺 TypeScript/Angular Standards

### Naming Conventions
- **Components**: kebab-case with descriptive names
  ```typescript
  // email-reader.component.ts
  @Component({
    selector: 'app-email-reader',
    ...
  })
  ```
- **Services**: camelCase ending with Service
  ```typescript
  export class EmailService { ... }
  ```
- **Models/Interfaces**: PascalCase
  ```typescript
  export interface EmailModel { ... }
  ```

### Code Style
- Use 2 spaces for indentation
- Use TSLint/ESLint with provided configuration
- Always specify types when possible
- Use readonly for immutable properties
- Use private/public modifiers appropriately

```typescript
// Good
export interface EmailSearchRequest {
  query: string;
  senderEmail?: string;
  maxResults: number;
}

export class EmailService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  searchEmails(request: EmailSearchRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/gmail/emails`, request);
  }
}
```

### Component Structure
- Follow Angular style guide
- Use standalone components (as in this project)
- Implement OnInit where appropriate
- Unsubscribe from observables to prevent memory leaks

```typescript
@Component({
  selector: 'app-email-reader',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './email-reader.component.html',
  styleUrls: ['./email-reader.component.css']
})
export class EmailReaderComponent implements OnInit {
  // Properties
  emails: Email[] = [];
  
  // Constructor
  constructor(
    private emailService: EmailService,
    private router: Router
  ) {}
  
  // Lifecycle hooks
  ngOnInit(): void {
    // Initialization logic
  }
  
  // Public methods
  searchEmails(): void {
    // Implementation
  }
  
  // Private methods
  private showMessage(text: string): void {
    // Implementation
  }
}
```

### Service Structure
- Use providedIn: 'root' for singleton services
- Use observables for async operations
- Handle errors appropriately
- Use interceptors for cross-cutting concerns

---

## 📁 File Naming Conventions

### Backend Files
- **Routes**: `{feature}-routes.js` (e.g., `auth-routes.js`)
- **Services**: `{feature}-service.js` (e.g., `email-service.js`)
- **Middleware**: `{purpose}-middleware.js` (e.g., `auth-middleware.js`)
- **Configuration**: `config.js` or `{purpose}.config.js`

### Frontend Files
- **Components**: `{feature}.component.{ts|html|css}`
- **Services**: `{feature}.service.ts`
- **Models**: `{entity}.model.ts` or `email.models.ts` (group related models)
- **Guards**: `{purpose}.guard.ts`
- **Pipes**: `{feature}.pipe.ts`

### Directories
- **Backend**: Use lowercase with hyphens if needed (e.g., `gmail-utils`)
- **Frontend**: Use lowercase with hyphens (e.g., `email-reader`)

---

## 🏗️ Code Structure

### Backend Structure
```
services/
├── auth-service.js          # Authentication logic
├── email-service.js         # Email operations
└── gmail-imap.js           # Gmail integration

routes/
├── auth-routes.js          # Authentication endpoints
└── gmail-routes.js         # Gmail endpoints

middleware/
└── auth-middleware.js      # Authentication middleware
```

### Frontend Structure
```
src/app/
├── components/
│   ├── {feature}/
│   │   ├── {feature}.component.ts
│   │   ├── {feature}.component.html
│   │   └── {feature}.component.css
├── services/
│   ├── auth.service.ts
│   └── email.service.ts
├── models/
│   └── email.models.ts
├── guards/
│   └── auth.guard.ts
└── app.routes.ts
```

### Service Organization
- Keep business logic in services
- Keep components thin (presentation logic only)
- Separate concerns appropriately
- Use dependency injection

---

## 📝 Documentation Standards

### Inline Comments
- Use JSDoc-style comments for functions
- Explain complex logic
- Keep comments up-to-date with code changes

```javascript
/**
 * Sends OTP to user's email
 * @param {string} email - User's email address
 * @returns {Promise<Object>} Result of OTP sending operation
 */
async sendOTP(email) {
  // Implementation
}
```

### TypeScript Comments
```typescript
/**
 * Searches emails based on provided criteria
 * @param request Search parameters
 * @returns Observable with search results
 */
searchEmails(request: EmailSearchRequest): Observable<EmailSearchResponse> {
  // Implementation
}
```

### File Headers
Include license and authorship information in major files:

```javascript
/**
 * @fileoverview Gmail IMAP Service for Email Extractor
 * @author Tuneer Mahatpure
 * @copyright JSC Global Solutions PVT. LTD.
 * @license MIT
 */
```

---

## 🧪 Testing Guidelines

### Unit Tests
- Aim for >80% code coverage
- Test edge cases and error conditions
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Test Structure
```javascript
describe('EmailService', () => {
  let service: EmailService;
  
  beforeEach(() => {
    // Setup
  });
  
  it('should search emails successfully', () => {
    // Arrange
    const request = { query: 'has:attachment', maxResults: 10 };
    
    // Act
    const result = service.searchEmails(request);
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

### Integration Tests
- Test API endpoints
- Mock external services
- Verify data flow between components

---

## 📦 Git Commit Standards

### Commit Message Format
```
<type>(<scope>): <short summary>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Formatting, missing semi-colons, etc
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Other changes

### Examples
```
feat(auth): add OTP verification functionality

Implements email-based OTP authentication system with 
token generation and validation.

Closes #123
```

```
fix(gmail): resolve IMAP connection timeout issue

Increased timeout from 30s to 60s to handle slow connections
```

### Branch Naming
- `feature/{issue-number}-{brief-description}`
- `bugfix/{issue-number}-{brief-description}`
- `hotfix/{issue-number}-{brief-description}`
- `docs/{brief-description}`

---

## 🔒 Security Standards

### Input Validation
- Always validate user inputs
- Sanitize data before processing
- Use parameterized queries when applicable

### Authentication
- Use JWT with proper expiration
- Implement token refresh mechanisms
- Secure sensitive data in environment variables

### Error Handling
- Don't expose internal errors to clients
- Log errors securely
- Implement rate limiting where appropriate

---

## 🚀 Performance Standards

### Backend
- Use connection pooling for database/IMAP connections
- Implement caching for frequently accessed data
- Optimize file processing for large attachments
- Use streaming for large data operations

### Frontend
- Implement lazy loading for components
- Use OnPush change detection strategy where appropriate
- Optimize bundle size
- Implement proper memory management

---

## 🔄 Code Review Checklist

### Before Submitting
- [ ] Code follows all style guidelines
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Error handling is implemented
- [ ] Security considerations are addressed
- [ ] Performance implications are considered
- [ ] Code is properly commented
- [ ] No debug statements left in code

### Review Process
- [ ] PR title clearly describes the change
- [ ] PR description explains the problem and solution
- [ ] Changes are atomic and focused
- [ ] Tests cover new functionality
- [ ] Edge cases are handled
- [ ] No breaking changes to public APIs
- [ ] Refactoring is separated from feature additions

---

## 🤝 Collaborative Development

### Pull Requests
- Keep PRs small and focused
- Reference relevant issues
- Include screenshots for UI changes
- Assign appropriate reviewers
- Address feedback promptly

### Code Ownership
- Take responsibility for your code
- Review others' code constructively
- Share knowledge through documentation
- Participate in team discussions

---

These standards ensure consistent, maintainable, and professional code quality throughout the Email Extractor project.